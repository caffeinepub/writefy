import { useCallback, useEffect, useRef, useState } from "react";

interface WordSample {
  wordCount: number;
  timestamp: number;
}

interface WritingMetricsState {
  episodeTarget: number;
  dailyGoal: number;
  dailyBaseWords: number;
  dailyDate: string;
}

const STORAGE_KEY = "writefy_metrics";
const SAMPLE_INTERVAL = 30_000; // 30s
const WPH_WINDOW = 10 * 60 * 1000; // 10 min in ms

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadMetrics(): WritingMetricsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WritingMetricsState;
  } catch {
    // ignore
  }
  return {
    episodeTarget: 5000,
    dailyGoal: 500,
    dailyBaseWords: 0,
    dailyDate: getToday(),
  };
}

function saveMetrics(state: WritingMetricsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useWritingMetrics(wordCount: number) {
  const samplesRef = useRef<WordSample[]>([]);
  const lastSampleWordCount = useRef<number>(wordCount);
  const [wph, setWph] = useState<number>(0);
  const [metrics, setMetrics] = useState<WritingMetricsState>(loadMetrics);

  // Reset daily base if day changed
  useEffect(() => {
    const today = getToday();
    if (metrics.dailyDate !== today) {
      const next = { ...metrics, dailyDate: today, dailyBaseWords: wordCount };
      setMetrics(next);
      saveMetrics(next);
    }
  }, [metrics, wordCount]);

  // Add sample every SAMPLE_INTERVAL when word count changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (wordCount !== lastSampleWordCount.current) {
        const now = Date.now();
        samplesRef.current = [
          ...samplesRef.current.filter((s) => now - s.timestamp < WPH_WINDOW),
          { wordCount, timestamp: now },
        ];
        lastSampleWordCount.current = wordCount;

        // Compute WPH from samples
        const window = samplesRef.current;
        if (window.length >= 2) {
          const oldest = window[0];
          const newest = window[window.length - 1];
          const deltaWords = newest.wordCount - oldest.wordCount;
          const deltaHours = (newest.timestamp - oldest.timestamp) / 3_600_000;
          if (deltaHours > 0 && deltaWords > 0) {
            setWph(Math.round(deltaWords / deltaHours));
          }
        }
      }
    }, SAMPLE_INTERVAL);
    return () => clearInterval(interval);
  }, [wordCount]);

  const setEpisodeTarget = useCallback(
    (target: number) => {
      const next = { ...metrics, episodeTarget: target };
      setMetrics(next);
      saveMetrics(next);
    },
    [metrics],
  );

  const setDailyGoal = useCallback(
    (goal: number) => {
      const next = { ...metrics, dailyGoal: goal };
      setMetrics(next);
      saveMetrics(next);
    },
    [metrics],
  );

  // Words written today = current - baseline
  const dailyWordsWritten = Math.max(
    0,
    wordCount -
      (metrics.dailyDate === getToday() ? metrics.dailyBaseWords : wordCount),
  );

  // ETA
  const wordsRemaining = Math.max(0, metrics.episodeTarget - wordCount);
  let etaLabel = "\u221e";
  if (wph > 0 && wordsRemaining > 0) {
    const hoursLeft = wordsRemaining / wph;
    if (hoursLeft < 1 / 60) {
      etaLabel = "< 1 min";
    } else if (hoursLeft < 1) {
      etaLabel = `~${Math.round(hoursLeft * 60)} min`;
    } else {
      etaLabel = `~${hoursLeft.toFixed(1)} hrs`;
    }
  } else if (wph > 0 && wordsRemaining === 0) {
    etaLabel = "Done!";
  }

  const episodeProgress = Math.min(
    100,
    (wordCount / Math.max(1, metrics.episodeTarget)) * 100,
  );

  const dailyProgress = Math.min(
    100,
    (dailyWordsWritten / Math.max(1, metrics.dailyGoal)) * 100,
  );

  return {
    wph,
    episodeTarget: metrics.episodeTarget,
    setEpisodeTarget,
    dailyGoal: metrics.dailyGoal,
    setDailyGoal,
    dailyWordsWritten,
    episodeProgress,
    dailyProgress,
    etaLabel,
    wordsRemaining,
  };
}
