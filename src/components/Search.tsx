import { useState } from 'react';
import { Search, X, Filter, ArrowUpDown, LoaderCircle } from 'lucide-react';
import { setTypesAndData, type SComponent } from './appStore';

export function takeDecision({ data, query }: { data: any[], query: string }) {
  // Handle empty data
  if (!data || data.length === 0) return;

  // Get columns from first object
  let columns = Object.keys(data[0]);
  let namedColumn = '';
  const acc = columns.reduce((acc, col) => {
    if (typeof data[0][col] === 'string' || (data[0][col] instanceof Date || (typeof data[0][col] === 'string' && !isNaN(Date.parse(data[0][col]))))) {
      if (acc['string']) {
        acc['string'] += 1;
      }
      else {
        acc['string'] = 1;
        namedColumn = col;
      }
    } else if (typeof data[0][col] === 'number') {
      if (acc['number']) {
        acc['number'] += 1;
      }
      else {
        acc['number'] = 1;
      }
    } else {
      if (acc['unknown']) {
        acc['unknown'] += 1;
      } else {
        acc['unknown'] = 1;
      }
    }
    return acc;
  }, {} as Record<string, any>);
  console.log('Columns:', acc);
  columns = columns.filter(col => col !== namedColumn);
  columns.unshift(namedColumn);
  if (acc['string'] > 1 || acc['unknown'] > 0) {
    setTypesAndData(['table'], data, query, columns);
  }
  else if (acc['number'] > 1) {
    setTypesAndData(['line', 'table'], data, query, columns);
  } else if (acc['number'] === 1) {
    setTypesAndData(['bar', 'pie', 'donut', 'table'], data, query, columns);
  } else {
    setTypesAndData(['table'], data, query, columns);
  }
}

export default function SearchComponent() {
  const [query, setQuery] = useState('show unique transaction of sender name and amount');
  const [loading, setLoading] = useState(false);
  const clearSearch = () => {
    setQuery('');
  };
  const getData = () => {
    setLoading(true)
    setTypesAndData([], [], '', []);
    fetch('/api/get-query-result', { method: 'POST', body: JSON.stringify({ queryDescription: query }), headers: { 'Content-Type': 'application/json' } })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        setLoading(false);
        takeDecision(data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });

  };
  return (
    <div className="relative mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <textarea
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Write your query description..."
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors duration-200"
        />
        {query && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">

            <button disabled={loading} onClick={getData} className="text-red-400 hover:text-red-600 transition-colors">
              {loading ? <LoaderCircle className="animate-spin text-blue-500 w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
            <button
              onClick={clearSearch}
              className=" text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}