"""
Parse UENR registration Excel files into student import CSV format.

Usage:
    python extract_students.py <input.xlsx>

Auto-detects header row, derives level/department/faculty
from filename or metadata rows.
"""
import openpyxl
import csv
import re
import os
import sys

def normalize_phone(raw):
    if not raw:
        return ""
    s = str(raw).strip()
    cleaned = re.sub(r"[^\d+]", "", s)
    if not cleaned:
        return ""
    if cleaned.startswith("+233"):
        cleaned = "0" + cleaned[4:]
    elif cleaned.startswith("233") and len(cleaned) == 12:
        cleaned = "0" + cleaned[3:]
    elif len(cleaned) == 9 and not cleaned.startswith("0"):
        cleaned = "0" + cleaned
    return cleaned if (cleaned.startswith("0") and len(cleaned) == 10) else ""

def parse_name(raw):
    raw = (raw or "").strip()
    is_female = "(ms)" in raw.lower()
    clean = re.sub(r"\s*\(ms\)\s*", "", raw, flags=re.IGNORECASE).strip()
    clean = re.sub(r"\s+", " ", clean)
    return clean, "female" if is_female else "male"

def extract_level_prog_from_filename(fname):
    """Parse level and programme from filename like:
    RegistrationForm_BSC. MECHANICAL ENGINEERING_100 (11).xlsx
    """
    basename = os.path.splitext(os.path.basename(fname))[0]
    parts = basename.split("_")
    # Find the level part: something like "100" or "100 (11)"
    level = None
    for i, p in enumerate(parts):
        # Extract leading digits from the part (e.g. "100 (11)" -> "100")
        digits = re.match(r"(\d+)", p.strip())
        if digits and int(digits.group(1)) in (100, 200, 300, 400):
            level = int(digits.group(1))
            # Programme is everything between "RegistrationForm" and the level part
            prog_parts = [parts[j] for j in range(1, i)]
            prog = " ".join(prog_parts).strip()
            return level, prog
    return level, ""

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_students.py <input.xlsx>")
        sys.exit(1)

    src = sys.argv[1]
    if not os.path.exists(src):
        print(f"File not found: {src}")
        sys.exit(1)

    wb = openpyxl.load_workbook(src, data_only=True)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))

    # Detect format: check if row 0 has "No" as first column -> simple header on row 0
    row0_val = str(all_rows[0][0] or "").strip() if all_rows[0][0] is not None else ""
    is_simple = row0_val == "No" or "Student Name" in str(all_rows[0][2] or "")

    metadata = {}

    if is_simple:
        header_row = 0
        level, prog = extract_level_prog_from_filename(src)
        metadata["level"] = level
        metadata["programme"] = prog
    else:
        header_row = 2
        # Metadata in row 0 and/or row 1
        for row in all_rows[:2]:
            for cell in row:
                cell_str = str(cell or "")
                m = re.search(r"Level:\s*(\d+)", cell_str)
                if m:
                    metadata["level"] = int(m.group(1))
                m = re.search(r"Program:\s*(.+)", cell_str)
                if m:
                    metadata["programme"] = m.group(1).strip()

        # Fallback to filename if metadata didn't yield both
        if not metadata.get("level") or not metadata.get("programme"):
            fl, fp = extract_level_prog_from_filename(src)
            metadata.setdefault("level", fl)
            metadata.setdefault("programme", fp)

    header = [str(c or "") if c is not None else "" for c in all_rows[header_row]]

    # Map columns
    col_map = {}
    for i, h in enumerate(header):
        h_clean = h.strip().lower()
        if "student name" in h_clean:
            col_map["name"] = i
        elif "contact" in h_clean:
            col_map["contact"] = i

    if "name" not in col_map:
        print("ERROR: Could not find 'Student Name' column. Header:", header)
        sys.exit(1)
    if "contact" not in col_map:
        print("ERROR: Could not find 'Contact' column. Header:", header)
        sys.exit(1)

    level = metadata.get("level", 0)
    prog = (metadata.get("programme") or "").strip()

    # Clean programme -> department (strip degree prefix)
    department = re.sub(
        r"^(BSC|B\.SC|B\.SC\.|BACHELOR OF SCIENCE(\s+IN)?)\s*\.?\s*",
        "", prog, flags=re.IGNORECASE
    ).strip()
    department = re.sub(r"\s+", " ", department)

    # Faculty lookup
    faculty_map = {
        "ENGINEERING": "Engineering",
        "SCIENCE": "Science",
        "TECHNOLOGY": "Technology",
        "BUSINESS": "Business",
        "LAW": "Law",
        "HEALTH": "Health Sciences",
        "AGRIC": "Agriculture",
        "ENVIRONMENT": "Environment and Sustainability",
        "ENERGY": "Energy",
    }
    faculty = "Engineering"
    for keyword, f in faculty_map.items():
        if keyword in department.upper():
            faculty = f
            break

    extracted = []
    for row in all_rows[header_row + 1:]:
        if row[col_map["name"]] is None:
            continue
        name_raw = str(row[col_map["name"]]).strip()
        phone_raw = row[col_map["contact"]] if col_map["contact"] < len(row) else None
        if not name_raw:
            continue
        full_name, gender = parse_name(name_raw)
        phone = normalize_phone(phone_raw)
        if not phone:
            print(f"SKIP: invalid phone '{phone_raw}' for {name_raw}")
            continue
        extracted.append({
            "phone": phone,
            "full_name": full_name,
            "gender": gender,
            "level": level,
            "department": department,
            "faculty": faculty,
        })

    # Output filename
    prog_slug = re.sub(r"[^\w]+", "_", department.lower()).strip("_")
    dst = os.path.join(os.path.dirname(src), f"{prog_slug}_{level}_parsed.csv")
    # If file exists and locked, append a suffix
    for attempt in range(10):
        try:
            with open(dst, "w", newline="", encoding="utf-8-sig") as f:
                pass
            break
        except PermissionError:
            base, ext = os.path.splitext(dst)
            dst = f"{base}_{attempt+2}{ext}"

    with open(dst, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["phone", "full_name", "gender", "level", "department", "faculty"])
        writer.writeheader()
        writer.writerows(extracted)

    print(f"\nSummary:")
    print(f"  Programme: {prog}")
    print(f"  Department: {department}")
    print(f"  Level: {level}")
    print(f"  Faculty: {faculty}")
    print(f"  Total students: {len(extracted)}")
    print(f"  Output: {dst}")

if __name__ == "__main__":
    main()
