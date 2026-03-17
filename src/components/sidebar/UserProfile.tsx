import React from 'react';
import { User } from '../../types/types';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const initial = user.name.charAt(0);
  return (
    <div
      className="flex items-center space-x-2 cursor-pointer px-2 py-1 rounded-md hover:bg-black/[0.04] transition-colors duration-100 select-none"
      onClick={(e) => e.preventDefault()}
    >
      <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
        {initial}
      </div>
      <span className="text-[13px] font-medium text-gray-700 truncate">{user.name}</span>
    </div>
  );
};

export default UserProfile;