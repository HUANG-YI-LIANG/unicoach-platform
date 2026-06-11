export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton-base ${className}`}
      style={style}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .skeleton-base {
          background: linear-gradient(
            90deg,
            var(--bg-tertiary, #2a2a2a) 25%,
            var(--bg-secondary, #3a3a3a) 50%,
            var(--bg-tertiary, #2a2a2a) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
          border-radius: 8px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="safe-area-bottom" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton style={{ width: '120px', height: '32px' }} />
        <Skeleton style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '140px', borderRadius: '16px' }} />
      <div>
        <Skeleton style={{ width: '80px', height: '24px', marginBottom: '16px' }} />
        <Skeleton style={{ width: '100%', height: '80px', borderRadius: '12px', marginBottom: '12px' }} />
        <Skeleton style={{ width: '100%', height: '80px', borderRadius: '12px' }} />
      </div>
    </div>
  );
}

export function PlansSkeleton() {
  return (
    <div className="safe-area-bottom" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton style={{ width: '120px', height: '32px' }} />
        <Skeleton style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>
      <div style={{ display: 'grid', gap: '16px' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ width: '100%', height: '180px', borderRadius: '16px' }} />
        ))}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="safe-area-bottom" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton style={{ width: '120px', height: '32px' }} />
        <Skeleton style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
      </div>
      <Skeleton style={{ width: '100%', height: '60px', borderRadius: '12px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} style={{ height: '40px', borderRadius: '8px' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ width: '100%', height: '60px', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  );
}
