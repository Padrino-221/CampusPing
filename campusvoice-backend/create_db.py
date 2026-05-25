import asyncio
import asyncpg

async def main():
    # Connect to the default system 'postgres' database first to run management queries
    conn = await asyncpg.connect(
        user="postgres",
        password="a39d13e9a4724f659a4e863f03e93d47",
        host="localhost",
        port=5432,
        database="postgres"
    )
    try:
        # Check if database already exists
        databases = await conn.fetch("SELECT datname FROM pg_database WHERE datname = 'campusvoice'")
        if not databases:
            await conn.execute("CREATE DATABASE campusvoice")
            print("Database 'campusvoice' created successfully!")
        else:
            print("Database 'campusvoice' already exists.")
    except Exception as e:
        print(f"An error occurred while creating the database: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
