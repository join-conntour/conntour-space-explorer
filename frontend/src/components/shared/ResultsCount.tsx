import React from 'react';

interface ResultsCountProps {
  currentPage: number;
  limit: number;
  total: number;
}

const ResultsCount: React.FC<ResultsCountProps> = ({ currentPage, limit, total }) => {
  return (
    <div className="text-center text-purple-200 text-sm font-medium mt-4">
      Showing {((currentPage - 1) * limit) + 1} to{' '}
      {Math.min(currentPage * limit, total)} of{' '}
      {total} results
    </div>
  );
};

export default ResultsCount;

