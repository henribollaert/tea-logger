// src/components/common/Skeleton.js
import React from 'react';
import './Skeleton.css';

// Base skeleton component with pulse animation
export const SkeletonItem = React.memo(({ className, style }) => (
  <div className={`skeleton-item ${className || ''}`} style={style} />
));

// Tea card skeleton
export const SkeletonTeaCard = React.memo(() => (
  <div className="skeleton-tea-card">
    <div className="skeleton-tea-header">
      <div className="skeleton-content">
        <SkeletonItem className="skeleton-title" />
        <div className="skeleton-tags">
          <SkeletonItem className="skeleton-tag" />
          <SkeletonItem className="skeleton-tag" />
        </div>
        <div className="skeleton-stats">
          <SkeletonItem className="skeleton-stat" />
          <SkeletonItem className="skeleton-stat" />
        </div>
      </div>
    </div>
  </div>
));

// Session card skeleton
export const SkeletonSessionCard = React.memo(() => (
  <div className="skeleton-session-card">
    <div className="skeleton-session-header">
      <div>
        <SkeletonItem className="skeleton-title" />
        <div className="skeleton-tags">
          <SkeletonItem className="skeleton-tag" />
          <SkeletonItem className="skeleton-tag" />
        </div>
      </div>
      <SkeletonItem className="skeleton-timestamp" />
    </div>
    <SkeletonItem className="skeleton-notes" />
  </div>
));

// Session details skeleton
export const SkeletonSessionDetails = React.memo(() => (
  <div className="skeleton-session-details">
    <div className="skeleton-tea-info">
      <SkeletonItem className="skeleton-title" />
      <div className="skeleton-tags">
        <SkeletonItem className="skeleton-tag" />
        <SkeletonItem className="skeleton-tag" />
        <SkeletonItem className="skeleton-tag" />
      </div>
      <SkeletonItem className="skeleton-timestamp" />
    </div>
    <div className="skeleton-divider" />
    <SkeletonItem className="skeleton-textarea" />
  </div>
));

// Tea collection list skeleton
export const SkeletonTeaList = React.memo(({ count = 3 }) => (
  <div className="skeleton-tea-list">
    {Array(count).fill(0).map((_, index) => (
      <SkeletonTeaCard key={index} />
    ))}
  </div>
));

// Session list skeleton
export const SkeletonSessionList = React.memo(({ count = 3 }) => (
  <div className="skeleton-session-list">
    {Array(count).fill(0).map((_, index) => (
      <SkeletonSessionCard key={index} />
    ))}
  </div>
));