import React from 'react';
import type { Landmark } from './LandmarkCard';
import LandmarkCard from './LandmarkCard';
import { AnimatePresence, motion } from 'framer-motion';

interface ListViewProps {
    landmarks: Landmark[];
    onSelectLandmark: (landmark: Landmark) => void;
}

const ListView: React.FC<ListViewProps> = ({ landmarks, onSelectLandmark }) => {
    return (
        <div className="px-6 py-8">
            {landmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <p className="text-lg font-medium">No landmarks found matching your criteria</p>
                    <p className="text-sm">Try adjusting your filters or search terms</p>
                </div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {landmarks.map((landmark) => (
                            <LandmarkCard
                                key={landmark.id}
                                landmark={landmark}
                                onClick={() => onSelectLandmark(landmark)}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
};

export default ListView;
