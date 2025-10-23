import { filterThread, prepareRules as enginePrepareRules, RuleMatchLogEvent } from './comment-filter-engine';
import { CF2Thread, NGWordRule, Settings } from '@/types/filter-types';

interface ProcessRequest {
  type: 'process';
  payload: {
    threads: CF2Thread[];
    rules: NGWordRule[];
    currentSmid: string | null;
    settings: Settings | null;
    debugMode: boolean;
  };
}

interface ProcessResponse {
  type: 'result';
  payload: {
    threads: CF2Thread[];
    logs: RuleMatchLogEvent[];
  };
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ProcessRequest>) => {
  const { data } = event;

  if (data.type === 'process') {
    const { threads, rules, currentSmid, settings, debugMode } = data.payload;

    const effectiveSettings: Settings | null = settings ?? null;

    const regexCache = new Map<string, RegExp>();
    const preparedRules = enginePrepareRules(rules, currentSmid, regexCache);

    const processedThreads: CF2Thread[] = [];
    const allLogs: RuleMatchLogEvent[] = [];

    for (const thread of threads) {
      const { comments, logs } = filterThread({
        thread,
        preparedRules,
        settings: effectiveSettings,
        regexCache,
        debugMode
      });
      processedThreads.push({ ...thread, comments });
      allLogs.push(...logs);
    }

    const response: ProcessResponse = {
      type: 'result',
      payload: {
        threads: processedThreads,
        logs: allLogs
      }
    };

    ctx.postMessage(response);
  }
};



