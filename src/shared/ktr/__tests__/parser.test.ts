import { describe, expect, it } from 'vitest';
import { parseKtrPayload } from '@shared/ktr/parser';

describe('parseKtrPayload', () => {
  it('parses direct KTR structure', () => {
    const payload = {
      steps: [
        { name: 'Extract', type: 'TableInput' },
        { name: 'Transform', type: 'ScriptValueMod' }
      ],
      rs: [
        {
          batch: 'B1',
          startAt: '2024-01-01T00:00:00Z',
          statuses: [
            { step: 'Extract', exit: 0, duration: 100, nr: 'E=0', speed: 10 },
            { step: 'Transform', exit: 0, duration: 250, nr: 'E=0', speed: 5 }
          ],
          takeTime: 250,
          exit: 0,
          errors: 0
        }
      ],
      summary: {
        rs: [
          {
            batch: 'B1',
            startAt: '2024-01-01T00:00:00Z',
            statuses: [
              { step: 'Extract', exit: 0, duration: 100, nr: 'E=0' },
              { step: 'Transform', exit: 0, duration: 250, nr: 'E=0' }
            ],
            takeTime: 250,
            exit: 0,
            errors: 0
          }
        ],
        pull: { takeTime: 50 },
        push: { takeTime: 75 }
      }
    };

    const result = parseKtrPayload(payload);
    expect(result).not.toBeNull();
    expect(result?.runs).toHaveLength(1);
    const run = result?.runs[0];
    expect(run?.overallStatus).toBe('success');
    expect(run?.steps[0]?.status).toBe('success');
    expect(run?.steps[1]?.realDuration).toBe(150);
    expect(result?.pullTime).toBe(50);
    expect(result?.pushTime).toBe(75);
  });

  it('parses wrapped API response', () => {
    const payload = {
      result: [
        {
          ext_data: JSON.stringify({
            steps: [{ name: 'Load', type: 'JsonOutput' }],
            rs: [{ statuses: [{ step: 'Load', exit: 2, duration: 120, nr: 'E=0' }], exit: 2 }]
          }),
          ext_summary: JSON.stringify({ rs: [{ statuses: [{ step: 'Load', exit: 2, duration: 120, nr: 'E=0' }] }] })
        }
      ]
    };

    const result = parseKtrPayload(payload);
    expect(result?.runs[0]?.overallStatus).toBe('running');
    expect(result?.runs[0]?.steps[0]?.status).toBe('running');
  });

  it('returns null for invalid payload', () => {
    expect(parseKtrPayload('not-json')).toBeNull();
    expect(parseKtrPayload({ foo: 'bar' })).toBeNull();
  });
});
