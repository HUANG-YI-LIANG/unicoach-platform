'use client';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">免責聲明</h1>
        
        <div className="prose prose-blue text-gray-700 space-y-4">
          <p className="font-semibold text-lg border-b pb-2">1. 服務性質</p>
          <p>UniCoach 僅作為提供「大學生教練」與「學員」之間聯繫、預約及資訊交流的媒合平台。我們不保證教練之教學品質、課程效果或其人格背景之絕對真實性。</p>
          
          <p className="font-semibold text-lg border-b pb-2">2. 安全與法律風險</p>
          <p>使用者在使用本平台預約服務時，應自行評估交易風險及人身安全。雙方私下達成之交易行為與本平台無涉。如發生任何法律爭議、財產損失或人身傷害，UniCoach 不承擔任何直接或間接之賠償責任。</p>
          
          <p className="font-semibold text-lg border-b pb-2">3. 資訊準確性</p>
          <p>本平台內容由用戶自行發布，UniCoach 雖會盡力審核，但對其完整性、即時性與準確性不作明示或默示之保證。</p>
          
          <p className="font-semibold text-lg border-b pb-2">4. 服務中斷</p>
          <p>本平台可能因維護、故障或其他不可抗力因素導致暫時中斷，對於因此造成之不便或損失，本平台不負補償責任。</p>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-4">當您勾選同意時，代表您已充分理解並接受上述所有條款。</p>
          <button 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-200"
          >
            返回註冊
          </button>
        </div>
      </div>
    </div>
  );
}
