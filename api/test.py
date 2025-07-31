from gen_sql.schema import extract_table_names, get_schema
if __name__ == '__main__':
  print(extract_table_names(get_schema()))
