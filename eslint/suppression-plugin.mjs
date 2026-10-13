export const suppressionPlugin = {
  rules: {
    'require-disable-reason': {
      meta: {
        type: 'problem',
        schema: [],
        messages: { reason: 'Name the disabled rules and add a concrete reason after "--".' },
      },
      create: (context) => ({
        Program: () => {
          for (const comment of context.sourceCode.getAllComments()) {
            const directive = /^\s*eslint-disable(?:-next-line|-line)?\b(?<body>.*)$/su.exec(comment.value);
            if (!directive) continue;
            const [rules, reason] = directive.groups.body.split(/\s+--\s+/u);
            if (!rules.trim() || !reason?.trim()) context.report({ loc: comment.loc, messageId: 'reason' });
          }
        },
      }),
    },
  },
};
