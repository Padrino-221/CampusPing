import asyncio 
from sqlalchemy.ext.asyncio import AsyncSession 
from app.database import AsyncSessionLocal 
from app.models.student import StudentDirectory 
from app.models.institution import Institution 
from sqlalchemy import select 
import uuid 
async def seed(): 
    async with AsyncSessionLocal() as s: 
        inst = await s.execute(select(Institution).limit(1)) 
        inst = inst.scalar() 
        if not inst: print('No institution'); return 
        students = [ 
            StudentDirectory(institution_id=inst.id, full_name='Alice Smith', phone='0541234567', gender='Female', level=100, department='Computer Science', faculty='Science', hall='Queens'), 
            StudentDirectory(institution_id=inst.id, full_name='Bob Jones', phone='0541234568', gender='Male', level=200, department='Mathematics', faculty='Science', hall='Unity'), 
            StudentDirectory(institution_id=inst.id, full_name='Charlie Brown', phone='0541234569', gender='Male', level=100, department='Computer Science', faculty='Science', hall='Unity'), 
            StudentDirectory(institution_id=inst.id, full_name='Diana Prince', phone='0541234570', gender='Female', level=300, department='Physics', faculty='Science', hall='Africa') 
        ] 
        s.add_all(students) 
        await s.commit() 
        print('Seeded students') 
asyncio.run(seed()) 
