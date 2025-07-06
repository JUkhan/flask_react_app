import psycopg2
import json
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from decimal import Decimal
from datetime import datetime, date
import logging
import threading
from contextlib import contextmanager

class PostgreSQLConnectionPool:
    """PostgreSQL connection pool manager"""
    
    def __init__(self, connection_params, min_connections=1, max_connections=20):
        """
        Initialize connection pool.
        
        Args:
            connection_params (dict): Database connection parameters
            min_connections (int): Minimum number of connections in pool
            max_connections (int): Maximum number of connections in pool
        """
        self.connection_params = connection_params
        self._pool = None
        self._lock = threading.Lock()
        
        try:
            self._pool = psycopg2.pool.ThreadedConnectionPool(
                min_connections,
                max_connections,
                host=connection_params.get('host', 'localhost'),
                database=connection_params['database'],
                user=connection_params['user'],
                password=connection_params['password'],
                port=connection_params.get('port', 5432)
            )
            logging.info(f"Connection pool created with {min_connections}-{max_connections} connections")
        except psycopg2.Error as e:
            logging.error(f"Error creating connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """
        Context manager to get a connection from the pool.
        Automatically returns connection to pool when done.
        """
        connection = None
        try:
            with self._lock:
                connection = self._pool.getconn()
            if connection:
                yield connection
        except psycopg2.Error as e:
            logging.error(f"Error getting connection from pool: {e}")
            raise
        finally:
            if connection:
                with self._lock:
                    self._pool.putconn(connection)
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self._pool:
            self._pool.closeall()
            logging.info("All connections in pool closed")

# Global connection pool instance
_connection_pool = None
_pool_lock = threading.Lock()

def initialize_connection_pool(connection_params, min_connections=1, max_connections=20):
    """
    Initialize the global connection pool.
    
    Args:
        connection_params (dict): Database connection parameters
        min_connections (int): Minimum number of connections in pool
        max_connections (int): Maximum number of connections in pool
    """
    global _connection_pool
    
    with _pool_lock:
        if _connection_pool is None:
            _connection_pool = PostgreSQLConnectionPool(
                connection_params, min_connections, max_connections
            )
        else:
            logging.warning("Connection pool already initialized")
    
    return _connection_pool

def get_connection_pool():
    """Get the global connection pool instance"""
    global _connection_pool
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized. Call initialize_connection_pool() first.")
    return _connection_pool

def fetch_postgresql_data(query, parameters=None, pool_instance=None):
    """
    Fetch data from PostgreSQL using connection pool and return as JSON format.
    
    Args:
        query (str): SQL query to execute
        parameters (tuple/list, optional): Query parameters for prepared statements
        pool_instance (PostgreSQLConnectionPool, optional): Specific pool instance to use
    
    Returns:
        str: JSON formatted string of query results
    
    Raises:
        psycopg2.Error: Database connection or query errors
        json.JSONEncodeError: JSON serialization errors
    """
    
    def json_serializer(obj):
        """Custom JSON serializer for PostgreSQL data types"""
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, Decimal):
            return float(obj)
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    
    # Use provided pool or global pool
    pool_to_use = pool_instance or get_connection_pool()
    
    try:
        with pool_to_use.get_connection() as connection:
            # Use RealDictCursor to get results as dictionaries
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                # Execute query with optional parameters
                if parameters:
                    cursor.execute(query, parameters)
                else:
                    cursor.execute(query)
                
                # Fetch all results
                results = cursor.fetchall()
                
                # Convert to list of dictionaries
                data = [dict(row) for row in results]
                
                # Convert to JSON
                json_result = json.dumps(data, default=json_serializer, indent=2)
                
                logging.info(f"Successfully fetched {len(data)} rows from PostgreSQL")
                return json_result
                
    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except json.JSONEncodeError as e:
        logging.error(f"JSON serialization error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

def fetch_postgresql_data_as_dict(query, parameters=None, pool_instance=None):
    """
    Fetch data from PostgreSQL using connection pool and return as Python dictionary.
    
    Returns:
        list: List of dictionaries representing query results
    """
    pool_to_use = pool_instance or get_connection_pool()
    
    try:
        with pool_to_use.get_connection() as connection:
            # Use RealDictCursor to get results as dictionaries
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                # Execute query with optional parameters
                if parameters:
                    cursor.execute(query, parameters)
                else:
                    cursor.execute(query)
                
                # Fetch all results
                results = cursor.fetchall()
                
                # Convert to list of dictionaries
                data = [dict(row) for row in results]
                logging.info(f"Successfully fetched {len(data)} rows from PostgreSQL")
                return data
                
    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except json.JSONEncodeError as e:
        logging.error(f"JSON serialization error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

def get_postgres_schema_with_description(fileName="schema.txt", schema_name="public", pool_instance=None):
    
    pool_to_use = pool_instance or get_connection_pool()
    
    try:
        with pool_to_use.get_connection() as connection:
            # Use RealDictCursor to get results as dictionaries
            with connection.cursor() as cursor:
                # Dictionary to store table information
                tables = {}
                
                # Query to get all tables in the specified schema with descriptions
                cursor.execute(f"""
                    SELECT t.table_name, obj_description(c.oid) as table_description
                    FROM information_schema.tables t
                    LEFT JOIN pg_class c ON c.relname = t.table_name
                    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE t.table_schema = %s 
                    AND t.table_type = 'BASE TABLE'
                    AND (n.nspname = %s OR n.nspname IS NULL)
                    ORDER BY t.table_name
                """, (schema_name, schema_name))
                
                table_info = cursor.fetchall()
                
                # For each table, get its columns information with descriptions
                for table_name, table_description in table_info:
                    # Get column information with descriptions
                    cursor.execute(f"""
                        SELECT 
                            c.column_name, 
                            c.data_type, 
                            CASE WHEN c.character_maximum_length IS NOT NULL 
                                THEN c.data_type || '(' || c.character_maximum_length || ')'
                                ELSE c.data_type
                            END as full_data_type,
                            col_description(pgc.oid, c.ordinal_position) as column_description
                        FROM information_schema.columns c
                        LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
                        LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace
                        WHERE c.table_schema = %s 
                        AND c.table_name = %s
                        AND (pgn.nspname = %s OR pgn.nspname IS NULL)
                        ORDER BY c.ordinal_position
                    """, (schema_name, table_name, schema_name))
                    
                    columns = cursor.fetchall()
                    tables[table_name] = {
                        'description': table_description,
                        'columns': []
                    }
                    
                    for column_data in columns:
                        col_name, data_type, full_data_type, col_description = column_data
                        # Convert data type to uppercase for consistency
                        display_type = full_data_type.upper()
                        tables[table_name]['columns'].append([
                            col_name, 
                            display_type, 
                            col_description
                        ])
                
                # Get primary key constraints
                cursor.execute(f"""
                    SELECT tc.table_name, kc.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kc
                        ON tc.constraint_name = kc.constraint_name
                        AND tc.table_schema = kc.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = %s
                """, (schema_name,))
                
                for table_name, column_name in cursor.fetchall():
                    if table_name in tables:
                        for i, column_info in enumerate(tables[table_name]['columns']):
                            if column_info[0] == column_name:
                                # Insert Primary Key before description
                                if len(column_info) == 3:  # col_name, type, description
                                    column_info.insert(2, 'Primary Key')
                                else:
                                    column_info.append('Primary Key')
                                tables[table_name]['columns'][i] = column_info
                
                # Get foreign key constraints
                cursor.execute(f"""
                    SELECT 
                        kcu1.table_name AS fk_table_name,
                        kcu1.column_name AS fk_column_name,
                        kcu2.table_name AS referenced_table_name,
                        kcu2.column_name AS referenced_column_name
                    FROM information_schema.referential_constraints AS rc
                    JOIN information_schema.key_column_usage AS kcu1
                        ON kcu1.constraint_catalog = rc.constraint_catalog
                        AND kcu1.constraint_schema = rc.constraint_schema
                        AND kcu1.constraint_name = rc.constraint_name
                    JOIN information_schema.key_column_usage AS kcu2
                        ON kcu2.constraint_catalog = rc.unique_constraint_catalog
                        AND kcu2.constraint_schema = rc.unique_constraint_schema
                        AND kcu2.constraint_name = rc.unique_constraint_name
                        AND kcu2.ordinal_position = kcu1.ordinal_position
                    WHERE rc.constraint_schema = %s
                """, (schema_name,))
                
                for fk_table, fk_column, ref_table, ref_column in cursor.fetchall():
                    if fk_table in tables:
                        for i, column_info in enumerate(tables[fk_table]['columns']):
                            if column_info[0] == fk_column:
                                fk_constraint = f'Foreign Key to {ref_table}.{ref_column}'
                                # Insert FK constraint before description if it exists
                                if len(column_info) == 3:  # col_name, type, description
                                    column_info.insert(2, fk_constraint)
                                elif len(column_info) == 4:  # col_name, type, PK, description
                                    column_info.insert(3, fk_constraint)
                                else:
                                    column_info.append(fk_constraint)
                                tables[table_name]['columns'][i] = column_info
                
                # Format the output
                output = []
                for table_name in sorted(tables.keys()):
                    # Add table name and description
                    if tables[table_name]['description']:
                        output.append(f"Table: {table_name}")
                        output.append(f"Description: {tables[table_name]['description']}")
                    else:
                        output.append(f"Table: {table_name}")
                    
                    # Add columns
                    for column_info in tables[table_name]['columns']:
                        col_name = column_info[0]
                        col_type = column_info[1]
                        
                        # Handle different column_info structures
                        attributes = []
                        description = None
                        
                        # Extract attributes and description
                        for item in column_info[2:]:
                            if item and (item.startswith('Primary Key') or item.startswith('Foreign Key')):
                                attributes.append(item)
                            elif item and not (item.startswith('Primary Key') or item.startswith('Foreign Key')):
                                description = item
                        
                        # Build the column line
                        attr_str = ", ".join(attributes) if attributes else ""
                        if attr_str and description:
                            output.append(f"        {col_name} ({col_type}, {attr_str}) - {description}")
                        elif attr_str:
                            output.append(f"        {col_name} ({col_type}, {attr_str})")
                        elif description:
                            output.append(f"        {col_name} ({col_type}) - {description}")
                        else:
                            output.append(f"        {col_name} ({col_type})")
                    
                    output.append("")  # Empty line between tables
                
                # Write to file
                with open(fileName, "w") as f:
                    f.write("\n".join(output))
                
                return "schema created successfully"
                
    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except json.JSONEncodeError as e:
        logging.error(f"JSON serialization error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise
def get_postgres_schema(fileName="schema.txt", schema_name="public", pool_instance=None):
    
    pool_to_use = pool_instance or get_connection_pool()
    
    try:
        with pool_to_use.get_connection() as connection:
            # Use RealDictCursor to get results as dictionaries
            with connection.cursor() as cursor:
                # Dictionary to store table information
                tables = {}
                
                # Query to get all tables in the specified schema
                cursor.execute(f"""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    AND table_type = 'BASE TABLE'
                    ORDER BY table_name
                """, (schema_name,))
                
                table_names = [row[0] for row in cursor.fetchall()]
                
                # For each table, get its columns information
                for table_name in table_names:
                    # Get column information
                    cursor.execute(f"""
                        SELECT column_name, data_type, 
                            CASE WHEN character_maximum_length IS NOT NULL 
                                THEN data_type || '(' || character_maximum_length || ')'
                                ELSE data_type
                            END as full_data_type
                        FROM information_schema.columns 
                        WHERE table_schema = %s AND table_name = %s
                        ORDER BY ordinal_position
                    """, (schema_name, table_name))
                    
                    columns = cursor.fetchall()
                    tables[table_name] = {'columns': []}
                    
                    for column_data in columns:
                        col_name, data_type, full_data_type = column_data
                        # Convert data type to uppercase for consistency
                        display_type = full_data_type.upper()
                        tables[table_name]['columns'].append([col_name, display_type])
                
                # Get primary key constraints
                cursor.execute(f"""
                    SELECT tc.table_name, kc.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kc
                        ON tc.constraint_name = kc.constraint_name
                        AND tc.table_schema = kc.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = %s
                """, (schema_name,))
                
                for table_name, column_name in cursor.fetchall():
                    if table_name in tables:
                        for i, column_info in enumerate(tables[table_name]['columns']):
                            if column_info[0] == column_name:
                                column_info.append('Primary Key')
                                tables[table_name]['columns'][i] = column_info
                
                # Get foreign key constraints
                cursor.execute(f"""
                    SELECT 
                        kcu1.table_name AS fk_table_name,
                        kcu1.column_name AS fk_column_name,
                        kcu2.table_name AS referenced_table_name,
                        kcu2.column_name AS referenced_column_name
                    FROM information_schema.referential_constraints AS rc
                    JOIN information_schema.key_column_usage AS kcu1
                        ON kcu1.constraint_catalog = rc.constraint_catalog
                        AND kcu1.constraint_schema = rc.constraint_schema
                        AND kcu1.constraint_name = rc.constraint_name
                    JOIN information_schema.key_column_usage AS kcu2
                        ON kcu2.constraint_catalog = rc.unique_constraint_catalog
                        AND kcu2.constraint_schema = rc.unique_constraint_schema
                        AND kcu2.constraint_name = rc.unique_constraint_name
                        AND kcu2.ordinal_position = kcu1.ordinal_position
                    WHERE rc.constraint_schema = %s
                """, (schema_name,))
                
                for fk_table, fk_column, ref_table, ref_column in cursor.fetchall():
                    if fk_table in tables:
                        for i, column_info in enumerate(tables[fk_table]['columns']):
                            if column_info[0] == fk_column:
                                column_info.append(f'Foreign Key to {ref_table}.{ref_column}')
                                tables[fk_table]['columns'][i] = column_info
                
                # Format the output
                output = []
                for table_name in sorted(tables.keys()):
                    output.append(f"Table: {table_name}")
                    for column_info in tables[table_name]['columns']:
                        col_name = column_info[0]
                        col_type = column_info[1]
                        attributes = column_info[2:] if len(column_info) > 2 else []
                        
                        attr_str = ", ".join(attributes) if attributes else ""
                        if attr_str:
                            output.append(f"        {col_name} ({col_type}, {attr_str})")
                        else:
                            output.append(f"        {col_name} ({col_type})")
                    output.append("")  # Empty line between tables
                
                

                with open(fileName, "w") as f:
                  f.write("\n".join(output))
                
                return "schema created successfully"
                
    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except json.JSONEncodeError as e:
        logging.error(f"JSON serialization error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

    
def execute_postgresql_query(query, parameters=None, pool_instance=None, fetch=True):
    """
    Execute PostgreSQL query using connection pool (INSERT, UPDATE, DELETE operations).
    
    Args:
        query (str): SQL query to execute
        parameters (tuple/list, optional): Query parameters for prepared statements
        pool_instance (PostgreSQLConnectionPool, optional): Specific pool instance to use
        fetch (bool): Whether to fetch results (False for INSERT/UPDATE/DELETE)
    
    Returns:
        int: Number of affected rows for non-fetch operations
        list: Query results for fetch operations
    """
    pool_to_use = pool_instance or get_connection_pool()
    
    try:
        with pool_to_use.get_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                if parameters:
                    cursor.execute(query, parameters)
                else:
                    cursor.execute(query)
                
                if fetch:
                    results = cursor.fetchall()
                    return [dict(row) for row in results]
                else:
                    connection.commit()
                    return cursor.rowcount
                    
    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

# Example usage and application class
class DatabaseManager:
    """Example application class using connection pooling"""
    
    def __init__(self, connection_params, pool_size=10):
        self.pool = PostgreSQLConnectionPool(connection_params, 1, pool_size)
    
    def get_users(self, limit=10):
        """Get users as JSON"""
        query = "SELECT * FROM users LIMIT %s"
        return fetch_postgresql_data(query, (limit,), self.pool)
    
    def get_user_by_id(self, user_id):
        """Get specific user"""
        query = "SELECT * FROM users WHERE id = %s"
        results = fetch_postgresql_data_as_dict(query, (user_id,), self.pool)
        return results[0] if results else None
    
    def create_user(self, name, email):
        """Create new user"""
        query = "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id"
        results = execute_postgresql_query(query, (name, email), self.pool)
        return results[0]['id'] if results else None
    
    def close(self):
        """Close all connections"""
        self.pool.close_all_connections()

def example_usage():
    """Example of how to use the connection pool functions"""
    
    # Database connection parameters
    db_params = {
        'host': 'localhost',
        'database': 'your_database',
        'user': 'your_username',
        'password': 'your_password',
        'port': 5432
    }
    
    try:
        # Method 1: Using global connection pool
        print("=== Using Global Connection Pool ===")
        
        # Initialize global pool
        initialize_connection_pool(db_params, min_connections=2, max_connections=10)
        
        # Use the pool for queries
        result1 = fetch_postgresql_data("SELECT * FROM users LIMIT 5")
        print("Users JSON:")
        print(result1)
        
        # Parameterized query
        result2 = fetch_postgresql_data_as_dict(
            "SELECT * FROM users WHERE id = %s", (1,)
        )
        print("\nUser dict:")
        print(result2)
        
        # Method 2: Using DatabaseManager class
        print("\n=== Using DatabaseManager Class ===")
        
        db_manager = DatabaseManager(db_params, pool_size=5)
        
        # Get users
        users_json = db_manager.get_users(3)
        print("Users from manager:")
        print(users_json)
        
        # Get specific user
        user = db_manager.get_user_by_id(1)
        print(f"\nSpecific user: {user}")
        
        # Create user (uncomment to test)
        # new_user_id = db_manager.create_user("John Doe", "john@example.com")
        # print(f"Created user with ID: {new_user_id}")
        
        # Clean up
        db_manager.close()
        
        # Close global pool
        get_connection_pool().close_all_connections()
        
    except Exception as e:
        print(f"Error in example: {e}")

# Utility function for batch operations
def execute_batch_queries(queries_with_params, pool_instance=None):
    """
    Execute multiple queries in a single transaction using connection pool.
    
    Args:
        queries_with_params (list): List of tuples (query, parameters)
        pool_instance (PostgreSQLConnectionPool, optional): Specific pool instance to use
    
    Returns:
        list: Results from all queries
    """
    pool_to_use = pool_instance or get_connection_pool()
    results = []
    
    try:
        with pool_to_use.get_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                for query, params in queries_with_params:
                    if params:
                        cursor.execute(query, params)
                    else:
                        cursor.execute(query)
                    
                    try:
                        result = cursor.fetchall()
                        results.append([dict(row) for row in result])
                    except psycopg2.ProgrammingError:
                        # Query doesn't return results (INSERT/UPDATE/DELETE)
                        results.append(cursor.rowcount)
                
                connection.commit()
                
    except psycopg2.Error as e:
        logging.error(f"Batch query error: {e}")
        raise
    
    return results

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run example (uncomment to test)
    # example_usage()