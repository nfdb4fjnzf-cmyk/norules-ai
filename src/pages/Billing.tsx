import React from 'react';

const Billing: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 animate-fade-in h-full">
      <div className="flex w-full max-w-sm flex-col items-center justify-center text-center">
        {/* Illustration Section */}
        <div className="flex items-center justify-center w-48 h-48 mb-8 relative">
          <div className="relative w-full h-full">
            <span className="material-symbols-outlined absolute -top-2 -left-2 text-4xl text-primary opacity-30" style={{ fontSize: '3rem' }}>auto_awesome</span>
            <span className="material-symbols-outlined absolute -bottom-4 right-8 text-2xl text-primary opacity-30" style={{ fontSize: '2rem' }}>star</span>
            <div className="absolute inset-0 m-auto flex h-36 w-36 items-center justify-center rounded-full bg-primary bg-opacity-10">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary bg-opacity-10">
                <span className="material-symbols-outlined text-primary dark:text-white" style={{ fontSize: '4rem' }}>lock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Content Section */}
        <div className="flex max-w-xs flex-col items-center gap-2 mb-10">
          <p className="text-2xl font-bold tracking-tight text-gray-100">Upgrade Required</p>
          <p className="text-base text-gray-400">This feature is only available in paid plans.</p>
        </div>

        {/* Button Section */}
        <div className="flex w-full flex-col items-center gap-3">
          <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-blue-500 hover:bg-blue-600 text-white text-base font-bold leading-normal transition-all duration-150 ease-out hover:opacity-80 active:scale-95">
            <span className="truncate">View Plans</span>
          </button>
          <button className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-4 bg-white/10 hover:bg-white/20 text-gray-200 text-base font-bold leading-normal transition-all duration-150 ease-out hover:opacity-80 active:scale-95">
            <span className="truncate">Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Billing;
