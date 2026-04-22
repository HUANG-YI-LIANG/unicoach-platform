import VideoFeed from '@/components/VideoFeed';

export const metadata = {
  title: '探索短影音 | UniCoach',
  description: '快速瀏覽教練教學精華與自我介紹，找到最適合你的專屬教練！',
};

export default function ExplorePage() {
  return (
    <main style={{ height: '100vh', width: '100vw', backgroundColor: '#000', overflow: 'hidden' }}>
      <VideoFeed />
    </main>
  );
}
