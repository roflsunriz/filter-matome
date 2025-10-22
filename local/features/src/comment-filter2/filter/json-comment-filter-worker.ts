import { filterJsonThread, prepareJsonRules, JsonRuleMatchEvent } from './json-comment-filter-engine';
import { CF2Thread, NgRuleJson, Settings } from '@/types/filter-types';

interface ProcessRequestPayload {
  threads: CF2Thread[];
  rules: NgRuleJson[];
  currentSmid: string | null;
  settings: Settings | null;
  debugMode: boolean;
}

interface ProcessResponsePayload {
  threads: CF2Thread[];
  logs: JsonRuleMatchEvent[];
}

interface ProcessRequest {
  type: 'process';
  payload: ProcessRequestPayload;
}

interface ProcessResponse {
  type: 'result';
  payload: ProcessResponsePayload;
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ProcessRequest>) => {
  const { data } = event;

  if (data.type === 'process') {
    const { threads, rules, currentSmid, settings } = data.payload;
    const regexCache = new Map<string, RegExp>();
    const preparedRules = prepareJsonRules(rules, currentSmid, regexCache);

    const processedThreads: CF2Thread[] = [];
    const allLogs: JsonRuleMatchEvent[] = [];

    for (const thread of threads) {
      const { comments, logs } = filterJsonThread({
        thread,
        preparedRules,
        settings,
        regexCache,
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


