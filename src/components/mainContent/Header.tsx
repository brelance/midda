import React from 'react';
import SearchInput from '../ui/SearchInput';
import BrutalistButton from '../ui/BrutalistButton';

interface HeaderProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onSort: () => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, onSearch, onSort }) => {
  return (
    <header className="h-20 flex-shrink-0 flex items-center justify-between p-4 border-b-4 border-black bg-[#f5f5dc]">
      <h1 className="text-4xl font-black">我的书架</h1>
      <div className="flex items-center space-x-4">
        <SearchInput
          value={searchQuery}
          onChange={onSearch}
          className="w-64"
        />
        <BrutalistButton onClick={onSort}>
          排序
        </BrutalistButton>
      </div>
    </header>
  );
};

export default Header;