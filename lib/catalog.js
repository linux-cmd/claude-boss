const entry = (id,source,phase,pattern) => ({id,source,phase,pattern});
export const catalog = [
  entry('ui-ux-pro-max','https://github.com/nextlevelbuilder/ui-ux-pro-max-skill','design',/ui-ux-pro-max/),
  entry('frontend-design','https://github.com/anthropics/skills','design',/frontend-design/),
  entry('react-best-practices','https://github.com/vercel-labs/agent-skills','implementation',/react-best|composition-pattern/),
  entry('webapp-testing','https://github.com/anthropics/skills','verification',/webapp-testing|playwright/),
  entry('web-design-guidelines','https://github.com/vercel-labs/agent-skills','verification',/web-design-guidelines/),
  entry('revenuecat','https://github.com/RevenueCat/ai-toolkit','billing',/revenuecat/),
  entry('deploy-to-vercel','https://github.com/vercel-labs/agent-skills','deployment',/deploy-to-vercel|deployments-cicd/),
  entry('cloudflare','https://github.com/cloudflare/skills','infrastructure',/cloudflare|wrangler/),
  entry('claude-api','https://github.com/anthropics/skills','AI',/claude-api/)
];

export function catalogView(query,inventory) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.filter(item => words.every(word => (item.id+' '+item.source+' '+item.phase).toLowerCase().includes(word)))
    .map(({pattern,...item}) => ({...item,configuredSkills:inventory.skills.filter(skill => pattern.test(skill.id)).map(skill => skill.id)}));
}
