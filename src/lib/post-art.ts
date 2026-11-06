const motifs = ['memory', 'atom', 'terminal', 'chip', 'cloud', 'notes', 'server', 'network', 'containers', 'laptop', 'keyboard', 'books', 'constellation', 'teacup', 'camera', 'gamepad', 'chart', 'neural'] as const;
type Motif = typeof motifs[number];
const palettes = ['rose', 'sky', 'lavender', 'sage', 'peach', 'mint', 'honey', 'periwinkle'] as const;
const panels = ['slant', 'arch', 'inset'] as const;
const patterns = ['orbit', 'grid', 'sparkle', 'petal'] as const;

// Salt each choice separately so a motif is not always paired with the same
// palette or frame. The article ID keeps its appearance stable on every page.
function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.codePointAt(0)!, 16777619);
  result = Math.imul(result ^ (result >>> 16), 0x85ebca6b);
  result = Math.imul(result ^ (result >>> 13), 0xc2b2ae35);
  return (result ^ (result >>> 16)) >>> 0;
}

export function getPostArt(id: string, title: string, tags: string[], category: string) {
  const choose = <T>(salt: string, options: readonly T[]) => options[hash(`${salt}:${id}`) % options.length];
  const subject = `${title} ${tags.join(' ')}`;
  let candidates: readonly Motif[];
  if (/内存|memory|IPC/i.test(subject)) candidates = ['memory'];
  else if (/原子|atomic/i.test(subject)) candidates = ['atom'];
  else if (/FPGA|绑核|CPU|硬件/i.test(subject)) candidates = ['chip'];
  else if (/迁移|migration/i.test(title)) candidates = ['cloud'];
  else if (/神经|机器学习|深度学习|人工智能|Neural|GPT/i.test(subject)) candidates = ['neural', 'constellation'];
  else if (/经济|帝国|Economy/i.test(subject)) candidates = ['chart'];
  else if (/proxy|dns|xray|网络测试/i.test(subject)) candidates = ['network'];
  else if (/Docker/i.test(subject)) candidates = ['containers', 'server'];
  else if (/Overleaf|Markdown/i.test(subject)) candidates = ['notes', 'books'];
  else if (/服务器|Server/i.test(subject)) candidates = ['server'];
  else if (/显卡|Nvidia|驱动|CUDA/i.test(subject)) candidates = ['chip', 'laptop'];
  else if (/命令|Termius|bash/i.test(subject)) candidates = ['terminal'];
  else if (/哈希|Python|编程|算法/i.test(title)) candidates = ['keyboard', 'terminal'];
  else if (/自学|指南|Guides/i.test(title)) candidates = ['books'];
  else if (/Linux|WSL|Ubuntu|RedHat|macOS|苹果|Homebrew/i.test(subject)) candidates = ['laptop', 'keyboard', 'terminal'];
  else if (/Video|视频|摄影/i.test(title)) candidates = ['camera'];
  else if (/Life is Strange|游戏/i.test(title)) candidates = ['gamepad'];
  else if (/小窝|新生/i.test(title)) candidates = ['teacup'];
  else if (/再见|随笔|生活|Life/i.test(`${title} ${category}`)) candidates = ['constellation', 'camera', 'teacup'];
  else candidates = ['notes', 'books', 'constellation', 'teacup'];

  return {
    kind: choose('motif', candidates),
    palette: choose('palette', palettes),
    panel: choose('panel', panels),
    pattern: choose('pattern', patterns),
    side: choose('side', ['left', 'right'] as const),
  };
}

export type PostArtStyle = ReturnType<typeof getPostArt>;
