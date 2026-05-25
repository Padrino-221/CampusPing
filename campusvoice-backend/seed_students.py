"""
Seed sample students into the student_directories table.

Usage:
    cd campusvoice-backend
    python seed_students.py
"""
import asyncio
import uuid
from datetime import datetime, timezone

from app.database import engine, AsyncSessionLocal
from app.models.student import StudentDirectory
from sqlalchemy import select, func

STUDENTS = [
    # UENR
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Kwame Mensah", "phone": "0241000001", "gender": "Male", "level": 100, "department": "Computer Science", "faculty": "Engineering", "hall": "Unity Hall", "programme": "BSc Computer Science", "student_id": "UENR001"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Ama Serwaa", "phone": "0241000002", "gender": "Female", "level": 200, "department": "Computer Science", "faculty": "Engineering", "hall": "Queens Hall", "programme": "BSc Computer Science", "student_id": "UENR002"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Yaw Boateng", "phone": "0241000003", "gender": "Male", "level": 300, "department": "Electrical Engineering", "faculty": "Engineering", "hall": "Unity Hall", "programme": "BSc Electrical Eng", "student_id": "UENR003"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Abena Asare", "phone": "0241000004", "gender": "Female", "level": 100, "department": "Nursing", "faculty": "Health Sciences", "hall": "Queens Hall", "programme": "BSc Nursing", "student_id": "UENR004"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Kofi Owusu", "phone": "0241000005", "gender": "Male", "level": 200, "department": "Business Admin", "faculty": "Business", "hall": "Independence Hall", "programme": "BBA Business Admin", "student_id": "UENR005"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Efua Appiah", "phone": "0241000006", "gender": "Female", "level": 300, "department": "Business Admin", "faculty": "Business", "hall": "Queens Hall", "programme": "BBA Business Admin", "student_id": "UENR006"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Kwesi Adu", "phone": "0241000007", "gender": "Male", "level": 400, "department": "Mathematics", "faculty": "Science", "hall": "Unity Hall", "programme": "BSc Mathematics", "student_id": "UENR007"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Akua Danso", "phone": "0241000008", "gender": "Female", "level": 100, "department": "Mathematics", "faculty": "Science", "hall": "Queens Hall", "programme": "BSc Mathematics", "student_id": "UENR008"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Nana Osei", "phone": "0241000009", "gender": "Male", "level": 200, "department": "Nursing", "faculty": "Health Sciences", "hall": "Independence Hall", "programme": "BSc Nursing", "student_id": "UENR009"},
    {"institution_id": "bb297c51-22a7-46fd-9c76-8ef521f6a99d", "full_name": "Adwoa Kyei", "phone": "0241000010", "gender": "Female", "level": 400, "department": "Electrical Engineering", "faculty": "Engineering", "hall": "Queens Hall", "programme": "BSc Electrical Eng", "student_id": "UENR010"},
    # KNUST
    {"institution_id": "496e5e9e-e4fb-49d9-83ca-dfecac902a5a", "full_name": "Joseph Amoah", "phone": "0241100001", "gender": "Male", "level": 100, "department": "Computer Science", "faculty": "Engineering", "hall": "Unity Hall", "programme": "BSc Computer Science", "student_id": "KNUST001"},
    {"institution_id": "496e5e9e-e4fb-49d9-83ca-dfecac902a5a", "full_name": "Grace Osei", "phone": "0241100002", "gender": "Female", "level": 200, "department": "Pharmacy", "faculty": "Pharmacy", "hall": "Queens Hall", "programme": "BPharm", "student_id": "KNUST002"},
    {"institution_id": "496e5e9e-e4fb-49d9-83ca-dfecac902a5a", "full_name": "Samuel Tetteh", "phone": "0241100003", "gender": "Male", "level": 300, "department": "Civil Engineering", "faculty": "Engineering", "hall": "Republic Hall", "programme": "BSc Civil Eng", "student_id": "KNUST003"},
    {"institution_id": "496e5e9e-e4fb-49d9-83ca-dfecac902a5a", "full_name": "Linda Ansah", "phone": "0241100004", "gender": "Female", "level": 100, "department": "Medicine", "faculty": "Medical Sciences", "hall": "Africa Hall", "programme": "MBChB", "student_id": "KNUST004"},
    {"institution_id": "496e5e9e-e4fb-49d9-83ca-dfecac902a5a", "full_name": "Daniel Antwi", "phone": "0241100005", "gender": "Male", "level": 200, "department": "Architecture", "faculty": "Built Environment", "hall": "Unity Hall", "programme": "BSc Architecture", "student_id": "KNUST005"},
    # UG
    {"institution_id": "8f1fe827-c2e2-4c5e-ac03-2167c969e169", "full_name": "Emmanuel Adjei", "phone": "0241200001", "gender": "Male", "level": 100, "department": "Political Science", "faculty": "Social Sciences", "hall": "Legon Hall", "programme": "BA Political Science", "student_id": "UG001"},
    {"institution_id": "8f1fe827-c2e2-4c5e-ac03-2167c969e169", "full_name": "Patience Mensah", "phone": "0241200002", "gender": "Female", "level": 200, "department": "Law", "faculty": "Law", "hall": "Akuafo Hall", "programme": "LLB", "student_id": "UG002"},
    {"institution_id": "8f1fe827-c2e2-4c5e-ac03-2167c969e169", "full_name": "Richard Ofori", "phone": "0241200003", "gender": "Male", "level": 300, "department": "Economics", "faculty": "Social Sciences", "hall": "Legon Hall", "programme": "BA Economics", "student_id": "UG003"},
    {"institution_id": "8f1fe827-c2e2-4c5e-ac03-2167c969e169", "full_name": "Eunice Boadi", "phone": "0241200004", "gender": "Female", "level": 400, "department": "Chemistry", "faculty": "Science", "hall": "Volta Hall", "programme": "BSc Chemistry", "student_id": "UG004"},
    {"institution_id": "8f1fe827-c2e2-4c5e-ac03-2167c969e169", "full_name": "Frank Asante", "phone": "0241200005", "gender": "Male", "level": 100, "department": "Computer Science", "faculty": "Science", "hall": "Legon Hall", "programme": "BSc Computer Science", "student_id": "UG005"},
]


async def seed():
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count(StudentDirectory.id)))).scalar()
        if count > 0:
            print(f"Student directory already has {count} records. Skipping seed.")
            return

        for s in STUDENTS:
            student = StudentDirectory(
                id=uuid.uuid4(),
                institution_id=uuid.UUID(s["institution_id"]),
                full_name=s["full_name"],
                phone=s["phone"],
                gender=s["gender"],
                level=s["level"],
                department=s["department"],
                faculty=s["faculty"],
                hall=s["hall"],
                programme=s["programme"],
                student_id=s["student_id"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            db.add(student)

        await db.commit()
        print(f"Seeded {len(STUDENTS)} sample students.")


if __name__ == "__main__":
    asyncio.run(seed())
