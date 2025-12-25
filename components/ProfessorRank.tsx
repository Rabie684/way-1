
import React from 'react';
import { Medal } from '../types';
import { getMedal, getMedalColor, getAuraClass } from '../utils';

interface Props {
  studentCount: number;
  avatar: string;
  size?: 'sm' | 'md' | 'lg';
}

const ProfessorRank: React.FC<Props> = ({ studentCount, avatar, size = 'md' }) => {
  const medal = getMedal(studentCount);
  const color = getMedalColor(medal);
  const aura = getAuraClass(studentCount);
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const userIconSize = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className={`rounded-full overflow-hidden border-2 border-white flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${sizeClasses[size]} ${aura}`}>
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <svg className={`${userIconSize[size]} text-gray-400`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>
      
      {medal !== Medal.NONE && (
        <div className={`absolute -bottom-2 -right-1 bg-white rounded-full p-1 shadow-md ${color}`}>
           {medal === Medal.KING ? (
             <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" /></svg>
           ) : medal === Medal.DIAMOND ? (
             <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L4.5,11L12,22L19.5,11L12,2Z" /></svg>
           ) : (
             <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
           )}
        </div>
      )}
      
      {medal === Medal.KING && (
        <span className="mt-2 text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
          الملك
        </span>
      )}
    </div>
  );
};

export default ProfessorRank;
