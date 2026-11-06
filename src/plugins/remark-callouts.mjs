import { visit } from 'unist-util-visit';

const labels = { note: '笔记', tip: '提示', important: '重点', warning: '注意', caution: '谨慎' };

export function remarkCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      if (!['containerDirective', 'leafDirective', 'textDirective'].includes(node.type)) return;
      if (labels[node.name]) {
        const data = node.data || (node.data = {});
        data.hName = 'aside';
        data.hProperties = { className: ['callout', `callout-${node.name}`], 'aria-label': labels[node.name] };
        const label = node.children?.[0]?.data?.directiveLabel ? node.children.shift().children : [{ type: 'text', value: labels[node.name] }];
        node.children.unshift({ type: 'paragraph', data: { hProperties: { className: ['callout-title'] } }, children: label });
      }
      if (node.name === 'github') {
        const repo = node.attributes?.repo;
        if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return;
        node.data = { hName: 'a', hProperties: { href: `https://github.com/${repo}`, className: ['github-repo'], target: '_blank', rel: 'noopener noreferrer' } };
        node.children = [{ type: 'text', value: `GitHub ↗  ${repo}` }];
      }
    });
  };
}
