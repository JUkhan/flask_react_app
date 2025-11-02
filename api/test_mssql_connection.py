"""
Test script to diagnose SQL Server connection issues
"""
import pyodbc

# List available ODBC drivers
print("=" * 60)
print("Available ODBC Drivers:")
print("=" * 60)
drivers = [driver for driver in pyodbc.drivers() if 'SQL' in driver.upper()]
if drivers:
    for i, driver in enumerate(drivers, 1):
        print(f"{i}. {driver}")
else:
    print("No SQL Server ODBC drivers found!")
    print("\nPlease install one of the following:")
    print("- ODBC Driver 17 for SQL Server")
    print("- ODBC Driver 18 for SQL Server")
    print("Download from: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server")

print("\n" + "=" * 60)
print("Testing Connections:")
print("=" * 60)

# Test connection strings to try
# Common SQL Server logins: sa, admin (you may need to know the password)
sql_usernames = ['sa']
sql_passwords = ['', 'sa', 'admin', 'password', 'Password123', 'pass123!']

test_configs = [
    # First try Windows Authentication
    {
        'name': 'SQL Server (Windows Auth)',
        'conn_str': 'DRIVER={SQL Server};SERVER=localhost;DATABASE=master;Trusted_Connection=yes;'
    },
    {
        'name': 'SQL Server (Windows Auth - SQLEXPRESS)',
        'conn_str': 'DRIVER={SQL Server};SERVER=localhost\\SQLEXPRESS;DATABASE=master;Trusted_Connection=yes;'
    },
    {
        'name': 'ODBC Driver 17 (Windows Auth)',
        'conn_str': 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=master;Trusted_Connection=yes;'
    },
    {
        'name': 'ODBC Driver 17 (Windows Auth - SQLEXPRESS)',
        'conn_str': 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost\\SQLEXPRESS;DATABASE=master;Trusted_Connection=yes;'
    },
]

# Add SQL Server Authentication tests
for username in sql_usernames:
    for password in sql_passwords:
        test_configs.append({
            'name': f'SQL Server (SQL Auth - sa/{password or "empty"})',
            'conn_str': f'DRIVER={{SQL Server}};SERVER=localhost;DATABASE=master;UID={username};PWD={password};'
        })
        test_configs.append({
            'name': f'ODBC Driver 17 (SQL Auth - sa/{password or "empty"})',
            'conn_str': f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER=localhost;DATABASE=master;UID={username};PWD={password};TrustServerCertificate=yes;'
        })

successful_connection = None

for config in test_configs:
    print(f"\nTrying: {config['name']}")
    try:
        conn = pyodbc.connect(config['conn_str'], timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        print(f"✓ SUCCESS!")
        print(f"  SQL Server Version: {version[:80]}...")
        successful_connection = config
        conn.close()
        break
    except pyodbc.Error as e:
        print(f"✗ Failed: {str(e)[:100]}")
    except Exception as e:
        print(f"✗ Error: {str(e)[:100]}")

print("\n" + "=" * 60)
if successful_connection:
    print("RECOMMENDED CONNECTION STRING FOR SQLALCHEMY:")
    print("=" * 60)

    # Convert to SQLAlchemy format
    if 'SQLEXPRESS' in successful_connection['conn_str']:
        server = 'localhost\\SQLEXPRESS'
    else:
        server = 'localhost'

    if 'ODBC Driver 17' in successful_connection['conn_str']:
        driver = 'ODBC+Driver+17+for+SQL+Server'
    elif 'ODBC Driver 18' in successful_connection['conn_str']:
        driver = 'ODBC+Driver+18+for+SQL+Server'
    else:
        driver = 'SQL+Server'

    # Check if it's SQL Server Authentication or Windows Authentication
    if 'Trusted_Connection=yes' in successful_connection['conn_str']:
        sqlalchemy_url = f"mssql+pyodbc://{server}/master?driver={driver}&Trusted_Connection=yes"
        if 'TrustServerCertificate' in successful_connection['conn_str']:
            sqlalchemy_url += "&TrustServerCertificate=yes"
    else:
        # Extract username and password
        import re
        uid_match = re.search(r'UID=([^;]+)', successful_connection['conn_str'])
        pwd_match = re.search(r'PWD=([^;]*)', successful_connection['conn_str'])
        username = uid_match.group(1) if uid_match else 'sa'
        password = pwd_match.group(1) if pwd_match else ''

        if password:
            sqlalchemy_url = f"mssql+pyodbc://{username}:{password}@{server}/master?driver={driver}"
        else:
            sqlalchemy_url = f"mssql+pyodbc://{username}:@{server}/master?driver={driver}"

        if 'TrustServerCertificate' in successful_connection['conn_str']:
            sqlalchemy_url += "&TrustServerCertificate=yes"

    print(f"\nDATABASE_URL = '{sqlalchemy_url}'")
    print("\nCopy this to your api-mssql.py file!")
    print(f"\nConnection method: {successful_connection['name']}")
else:
    print("NO SUCCESSFUL CONNECTIONS")
    print("=" * 60)
    print("\nPossible issues:")
    print("1. SQL Server is not installed")
    print("2. SQL Server service is not running")
    print("3. ODBC drivers are not installed")
    print("\nTo check SQL Server status, run in PowerShell:")
    print('   Get-Service | Where-Object {$_.Name -like "*SQL*"}')
print("=" * 60)
