def update_table_description(file_path, table_name, new_description):
    """
    Update the description of a table in the schema file by modifying only the description line.
    
    Args:
        file_path (str): Path to the schema.txt file
        table_name (str): Name of the table to update
        new_description (str): New description for the table
    
    Returns:
        bool: True if table was found and updated, False otherwise
    """
    import os
    
    try:
        # First pass: find the description line position and length
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        table_found = False
        description_line_index = -1
        original_description_line = ""
        
        for i, line in enumerate(lines):
            # Check if this line starts a table definition
            if line.startswith('Table: '):
                current_table = line.split('Table: ')[1].strip()
                
                # Check if this is the table we're looking for
                if current_table == table_name:
                    # Check if next line is a description line
                    if i + 1 < len(lines) and lines[i + 1].startswith('Description: '):
                        table_found = True
                        description_line_index = i + 1
                        original_description_line = lines[i + 1]
                        break
                    else:
                        # No description line exists, we'll need to insert one
                        # For this case, we'll fall back to rewriting approach
                        return update_table_description_with_insert(file_path, table_name, new_description, i + 1)
        
        if not table_found:
            return False
        
        # Create the new description line with same line ending as original
        line_ending = '\n' if original_description_line.endswith('\n') else ''
        new_description_line = f'Description: {new_description}{line_ending}'
        
        # Check if the new line is the same length as the old one
        if len(new_description_line) == len(original_description_line):
            # Perfect! We can do true in-place editing
            with open(file_path, 'r+', encoding='utf-8') as file:
                # Calculate byte position of the description line
                byte_position = 0
                for i in range(description_line_index):
                    byte_position += len(lines[i].encode('utf-8'))
                
                file.seek(byte_position)
                file.write(new_description_line)
            
            return True
        else:
            # Different length, need to rewrite the file
            lines[description_line_index] = new_description_line
            
            with open(file_path, 'w', encoding='utf-8') as file:
                file.writelines(lines)
            
            return True
    
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def update_table_description_with_insert(file_path, table_name, new_description, insert_position):
    """
    Helper function to handle cases where description line doesn't exist.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        # Insert new description line
        new_line = f'Description: {new_description}\n'
        lines.insert(insert_position, new_line)
        
        with open(file_path, 'w', encoding='utf-8') as file:
            file.writelines(lines)
        
        return True
    
    except Exception as e:
        print(f"Error inserting description: {str(e)}")
        return False


def update_table_description_simple(file_path, table_name, new_description):
    """
    Simple version that always rewrites the file (for comparison/fallback).
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        table_found = False
        
        for i, line in enumerate(lines):
            if line.startswith('Table: '):
                current_table = line.split('Table: ')[1].strip()
                
                if current_table == table_name:
                    if i + 1 < len(lines) and lines[i + 1].startswith('Description: '):
                        # Replace existing description
                        line_ending = '\n' if lines[i + 1].endswith('\n') else ''
                        lines[i + 1] = f'Description: {new_description}{line_ending}'
                        table_found = True
                        break
                    else:
                        # Insert new description
                        lines.insert(i + 1, f'Description: {new_description}\n')
                        table_found = True
                        break
        
        if table_found:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.writelines(lines)
        
        return table_found
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


# Example usage:
if __name__ == "__main__":
    # Example: Update the description of the 'order_items' table
    success = update_table_description('schema.txt', 'order_items', 'Represents individual items within orders, linking products to orders with quantities and prices.')
    
    if success:
        print("Table description updated successfully!")
    else:
        print("Table not found or error occurred.")
    
    # If you prefer the simpler approach that always rewrites:
    # success = update_table_description_simple('schema.txt', 'order_items', 'New description')
    
    print("\nTesting with different scenarios...")
    
    # Test with same-length description (true in-place edit)
    success = update_table_description('schema.txt', 'customers', 'Short description for customers table')
    print(f"Same-length update: {success}")
    
    # Test with different-length description (file rewrite)
    success = update_table_description('schema.txt', 'products', 'This is a much longer description for the products table that will require rewriting the file')
    print(f"Different-length update: {success}")