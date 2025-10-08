import React from 'react';
import { User } from '../../types/types';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <a
      href="#"
      className="
        flex items-center p-3 rounded-2xl font-bold text-xl
        text-black transition-all duration-200
        hover:bg-[#f0f0f0]
      "
      onClick={(e) => e.preventDefault()}
    >
      <svg
        className="w-7 h-7 mr-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
      <span>{user.name}</span>
    </a>
  );
};

export default UserProfile;