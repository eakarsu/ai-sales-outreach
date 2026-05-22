import { Router } from 'express';

const router = Router();

function scoreReply(reply: any) {
  const text = String(reply.text || '').toLowerCase();
  let urgency = 35;
  if (text.includes('pricing') || text.includes('budget')) urgency += 12;
  if (text.includes('competitor') || text.includes('vendor')) urgency += 16;
  if (text.includes('this week') || text.includes('today') || text.includes('tomorrow')) urgency += 18;
  if (text.includes('not interested') || text.includes('unsubscribe')) urgency -= 22;
  if (text.includes('security') || text.includes('legal')) urgency += 10;
  return Math.max(0, Math.min(100, urgency));
}

router.post('/score', (req, res) => {
  const replies = Array.isArray(req.body?.replies)
    ? req.body.replies
    : [
        { account: 'Acme Health', text: 'Can you send pricing before our vendor meeting tomorrow?' },
        { account: 'Northstar', text: 'Not interested right now.' },
      ];

  const triaged = replies
    .map((reply: any, index: number) => {
      const urgency = scoreReply(reply);
      const text = String(reply.text || '');
      const intent = /not interested|unsubscribe/i.test(text)
        ? 'suppress'
        : /pricing|budget/i.test(text)
          ? 'commercial'
          : /security|legal/i.test(text)
            ? 'review'
            : 'engage';
      return {
        id: reply.id || `reply-${index + 1}`,
        account: reply.account || 'Unknown account',
        urgency,
        intent,
        ownerAction: urgency >= 70 ? 'Call and send tailored proof today' : intent === 'suppress' ? 'Pause sequence and tag opt-out risk' : 'Reply with next-best asset',
        suggestedAsset: intent === 'commercial' ? 'ROI one-pager' : intent === 'review' ? 'Security packet' : 'Relevant case study',
      };
    })
    .sort((a: any, b: any) => b.urgency - a.urgency);

  res.json({
    triaged,
    hotCount: triaged.filter((item: any) => item.urgency >= 70).length,
    suppressCount: triaged.filter((item: any) => item.intent === 'suppress').length,
  });
});

export default router;
