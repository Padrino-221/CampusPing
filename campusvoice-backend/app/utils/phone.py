import re

GHANA_MOBILE_PREFIXES = {
    "020", "023", "024", "025", "026", "027", "028", "029",
    "050", "053", "054", "055", "056", "057", "058", "059",
}

def normalize_phone(phone: str) -> str:
    """
    Strips non-digit noise and normalizes phone records to local '0XXXXXXXXX' layout.
    Returns empty string if string fails Ghanaian network definitions.
    """
    if not phone or not isinstance(phone, str):
        return ""

    phone = re.sub(r"[^\d+]", "", phone.strip())
    if not phone:
        return ""

    if phone.startswith("+233"):
        phone = "0" + phone[4:]
    elif phone.startswith("233") and len(phone) >= 12:
        phone = "0" + phone[3:]
    elif phone.startswith("00233"):
        phone = "0" + phone[5:]

    if len(phone) == 10 and phone.startswith("0"):
        if phone[0:3] in GHANA_MOBILE_PREFIXES:
            return phone

    if len(phone) == 9 and not phone.startswith("0"):
        candidate = "0" + phone
        if candidate[0:3] in GHANA_MOBILE_PREFIXES:
            return candidate

    return ""


def chunk_list(lst: list, size: int = 100) -> list[list]:
    """
    Chunks a list into smaller sublists of a specified maximum size.
    Used to batch recipient lists when making third-party API requests.
    """
    if not lst:
        return []
    return [lst[i:i+size] for i in range(0, len(lst), size)]
