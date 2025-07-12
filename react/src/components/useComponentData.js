import { useState, useEffect } from 'react';

export const useComponentData = (query, data) => {
  const [xdata, setData] = useState(data || []); // Initialize with provided data or empty array
  useEffect(() => {
    console.log('useComponentData mounted with query:', query, data);
    if (!data || data.length === 0) {
      fetch(`/api/get-query-result2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
        .then((response) => response.json())
        .then((data) => {
          setData(data.data || []);
        })
        .catch((error) => {
          console.error('Error fetching query result:', error);
        });
    }
  }, [query, data]);
  return xdata;
};

export const colors = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#92a8d1',
  '#a4de6c',
  '#d0ed57',
  '#8dd1e1',
  '#d88884',
  '#b6b6b6',
  '#f67280',
  '#c06c84',
  '#6c5b7b',
  '#355c7d',
  '#f8b195',
  '#f7cac9',
];
