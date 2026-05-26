from sqlalchemy import select, and_, func
from app.models.student import StudentDirectory

def build_filter_conditions(institution_id, filters: dict):
    """
    Constructs a list of filter expressions based on the multi-select dropdown options.
    If a filter list is empty or omitted, it implies "select all" (no filter on that dimension).
    """
    conditions = [
        StudentDirectory.institution_id == institution_id,
        StudentDirectory.is_active == True
    ]

    if filters:
        if filters.get("gender"):
            conditions.append(StudentDirectory.gender.in_(filters["gender"]))
        
        if filters.get("levels"):
            # Levels could be passed as integers or strings, let's coerce them to integers
            levels = [int(lvl) for lvl in filters["levels"] if str(lvl).isdigit()]
            if levels:
                conditions.append(StudentDirectory.level.in_(levels))
        
        if filters.get("departments"):
            conditions.append(StudentDirectory.department.in_(filters["departments"]))
            
        if filters.get("faculties"):
            conditions.append(StudentDirectory.faculty.in_(filters["faculties"]))
            
    return conditions


# =====================================================================
# ASYNC IMPLEMENTATIONS (Used in FastAPI Endpoint Handlers)
# =====================================================================

async def get_filtered_students_async(db, institution_id, filters: dict) -> list:
    """
    Asynchronously queries student records based on filters. Returns list of StudentDirectory models.
    """
    conditions = build_filter_conditions(institution_id, filters)
    stmt = select(StudentDirectory).where(and_(*conditions))
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_filtered_count_async(db, institution_id, filters: dict) -> int:
    """
    Asynchronously queries only the matching count (much faster than fetching all records).
    """
    conditions = build_filter_conditions(institution_id, filters)
    stmt = select(func.count(StudentDirectory.id)).where(and_(*conditions))
    result = await db.execute(stmt)
    return result.scalar() or 0


# =====================================================================
# SYNC IMPLEMENTATIONS (Used in Celery Worker Background Tasks)
# =====================================================================

def get_filtered_students_sync(db, institution_id, filters: dict) -> list:
    """
    Synchronously queries student records based on filters.
    """
    conditions = build_filter_conditions(institution_id, filters)
    return db.query(StudentDirectory).filter(and_(*conditions)).all()


def get_filtered_count_sync(db, institution_id, filters: dict) -> int:
    """
    Synchronously counts matching student records based on filters.
    """
    conditions = build_filter_conditions(institution_id, filters)
    return db.query(func.count(StudentDirectory.id)).filter(and_(*conditions)).scalar() or 0
