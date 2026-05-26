import asyncio 
from sqlalchemy import select, func 
from app.database import AsyncSessionLocal 
from app.models.student import StudentDirectory 
async def count(): 
    async with AsyncSessionLocal() as s: 
        res = await s.execute(select(func.count(StudentDirectory.id))) 
        print('Total Students:', res.scalar()) 
asyncio.run(count()) 
