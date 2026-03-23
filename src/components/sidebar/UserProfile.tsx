import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface UserProfileProps {
  onNavigateToProfile?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onNavigateToProfile }) => {
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const displayName = isAuthenticated && authUser ? authUser.name : '未登录';
  const avatarUrl = isAuthenticated && authUser ? authUser.avatar : undefined;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="flex items-center space-x-2 cursor-pointer px-2 py-1 rounded-md hover:bg-black/[0.04] active:scale-[0.97] transition-all duration-100 select-none"
      onClick={onNavigateToProfile}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
          {initial}
        </div>
      )}
      <span className="text-[13px] font-medium text-gray-700 truncate flex-1">
        {isAuthenticated ? displayName : '登录'}
      </span>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
};

export default UserProfile;