interface DateDisplayProps {
  date: string | number | Date;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

export function DateDisplay({ date, format = 'long', className = '' }: DateDisplayProps) {
  // Handle undefined, null, or empty date values
  if (!date) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-sm font-medium ${className}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>No date available</span>
      </div>
    );
  }

  const formatDate = (dateValue: string | number | Date) => {
    let dateObj: Date;
    
    try {
      // Handle different input types
      if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        dateObj = new Date(dateValue as string | number);
      } else {
        return 'Invalid date format';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
    } catch (error) {
      return 'Invalid date';
    }

    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      
      case 'long':
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      
      case 'relative':
        const now = new Date();
        const diffInMs = now.getTime() - dateObj.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays === -1) return 'Tomorrow';
        if (diffInDays > 0 && diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 0 && diffInDays > -7) return `In ${Math.abs(diffInDays)} days`;
        
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      
      default:
        return dateObj.toLocaleDateString();
    }
  };

  const formattedDate = formatDate(date);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium ${className}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span>{formattedDate}</span>
    </div>
  );
} 