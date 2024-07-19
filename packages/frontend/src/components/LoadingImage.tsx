interface LoadingImageProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LoadingImage({ 
  className = '', 
  size = 'md',
  showText = true 
}: LoadingImageProps) {
  const sizeClasses = {
    sm: 'w-32 h-24',
    md: 'w-64 h-48', 
    lg: 'w-lg',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`relative overflow-hidden bg-gray-200 rounded ${sizeClasses[size]} ${className}`} style={{ minHeight: size === 'lg' ? '300px' : undefined }}>
      <div className="w-full h-full flex items-center justify-center">
        {/* Animated skeleton loader */}
        <div className="w-full h-full relative">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
          
          {/* Image icon placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <svg className={`${iconSizes[size]} animate-pulse mx-auto ${showText ? 'mb-2' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              {showText && (
                <p className={`${textSizes[size]}`}>Loading image...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 