import AnalysisLine from "./components/sentenceAnalyzer/AnalysisLine";

export default function App() {
  const mockCue = {
    type: "cue",
    data: {
      start: 0,
      end: 5000,
      text: "これはテストです",
      translation: "This is a test",
    },
  } as const;

  //   const mockSubtitleLineData = {
  //     startTime: 0,
  //     endTime: 5000,
  //     originalText: "これはテストです",
  //     tokens: [
  //       { word: "これ", pos: "代名詞" },
  //       { word: "は", pos: "助詞" },
  //       { word: "テスト", pos: "名詞" },
  //       { word: "です", pos: "助動詞" },
  //     ],
  //   };

  //   const mockSubtitleLineData = {};

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">AnalysisLine Component Test</h1>
      <AnalysisLine
        cue={mockCue as any}
        videoId="mock-video-id"
        subtitleLineData={undefined}
        openAnalysis={true}
      />
      <hr className="my-4" />
      <AnalysisLine
        cue={mockCue as any}
        videoId="mock-video-id"
        subtitleLineData={undefined}
        openAnalysis={false}
      />
    </div>
  );
}
