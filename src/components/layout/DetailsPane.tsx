import React from 'react';
import ContinueReading from '../detailsPane/ContinueReading';
import BookDetails from '../detailsPane/BookDetails';
import { Book } from '../../types/types';

interface DetailsPaneProps {
  selectedBook: Book | null;
}

const DetailsPane: React.FC<DetailsPaneProps> = ({
  selectedBook,
}) => {
  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-[#f5f5dc]">
      <div className="flex-grow p-6">
        {selectedBook ? (
          <>
            <ContinueReading book={selectedBook} />
            <BookDetails book={selectedBook} />
          </>
        ) : (
          <>
            <ContinueReading book={null} />
            <BookDetails book={null} />
          </>
        )}
      </div>
    </aside>
  );
};

export default DetailsPane;