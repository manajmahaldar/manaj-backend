const UserLearning = require('../../models/learning/UserLearning');
const LearningContent = require('../../models/learning/LearningContent');

// @desc    Track progress (video resume position or reading progress)
exports.trackProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { contentId, progress, watchedSeconds, lastPosition } = req.body;
        
        let completed = false;
        let completedAt = null;
        
        // 95% threshold counts as completion
        if (progress >= 95) {
            completed = true;
            completedAt = new Date();
        }
        
        const updateData = {
            progress,
            watchedSeconds,
            lastPosition,
            lastViewedAt: new Date()
        };
        
        if (completed) {
            updateData.completed = true;
            updateData.completedAt = completedAt;
        }
        
        const userProgress = await UserLearning.findOneAndUpdate(
            { userId, contentId },
            { $set: updateData },
            { upsert: true, new: true }
        );
        
        res.json({ success: true, data: userProgress });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Toggle bookmark state on a content item
exports.toggleBookmark = async (req, res) => {
    try {
        const userId = req.user.id;
        const { contentId } = req.body;
        
        const existing = await UserLearning.findOne({ userId, contentId });
        let isBookmarked = false;
        
        if (existing) {
            isBookmarked = !existing.bookmarked;
            existing.bookmarked = isBookmarked;
            await existing.save();
        } else {
            isBookmarked = true;
            const newRecord = new UserLearning({ userId, contentId, bookmarked: true });
            await newRecord.save();
        }
        
        res.json({ success: true, bookmarked: isBookmarked });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get bookmarked items for the logged in user
exports.getBookmarks = async (req, res) => {
    try {
        const userId = req.user.id;
        const bookmarks = await UserLearning.find({ userId, bookmarked: true })
            .populate({
                path: 'contentId',
                populate: { path: 'categories', select: 'name color icon' }
            });
            
        res.json({ success: true, data: bookmarks.filter(b => b.contentId !== null).map(b => b.contentId) });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get recently viewed items
exports.getRecentlyViewed = async (req, res) => {
    try {
        const userId = req.user.id;
        const recent = await UserLearning.find({ userId })
            .sort({ lastViewedAt: -1 })
            .limit(20)
            .populate({
                path: 'contentId',
                populate: { path: 'categories', select: 'name color icon' }
            });
            
        res.json({ success: true, data: recent.filter(r => r.contentId !== null).map(r => r.contentId) });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get continue learning modules (items in progress but not completed)
exports.getContinueLearning = async (req, res) => {
    try {
        const userId = req.user.id;
        const inProgress = await UserLearning.find({ userId, completed: false, progress: { $gt: 0 } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate({
                path: 'contentId',
                populate: { path: 'categories', select: 'name color icon' }
            });
            
        res.json({ success: true, data: inProgress.filter(i => i.contentId !== null) });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// @desc    Get overall learning metrics & streak info
exports.getMyProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const watched = await UserLearning.countDocuments({ userId, completed: true });
        const inProgressCount = await UserLearning.countDocuments({ userId, completed: false, progress: { $gt: 0 } });
        
        // Simple streak logic using lastViewedAt dates
        const lastViews = await UserLearning.find({ userId }, 'lastViewedAt')
            .sort({ lastViewedAt: -1 })
            .limit(10);
            
        let streak = 0;
        if (lastViews.length > 0) {
            const uniqueDates = new Set(
                lastViews.map(v => v.lastViewedAt.toDateString())
            );
            
            let dateCursor = new Date();
            while (uniqueDates.has(dateCursor.toDateString())) {
                streak++;
                dateCursor.setDate(dateCursor.getDate() - 1);
            }
            // If the streak didn't include today, check if it included yesterday
            if (streak === 0) {
                dateCursor = new Date();
                dateCursor.setDate(dateCursor.getDate() - 1);
                while (uniqueDates.has(dateCursor.toDateString())) {
                    streak++;
                    dateCursor.setDate(dateCursor.getDate() - 1);
                }
            }
        }
        
        res.json({
            success: true,
            data: {
                completedCount: watched,
                inProgressCount,
                learningStreak: streak
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};
