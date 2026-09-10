export type SceneRecord = {
  id: string
  slug: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  category: string
  cover: string
  prompt: string
  promptSource: string
  model: string
  thinking: string
  agent: string
  notes: string
  createdAt: string
  updatedAt: string
  renderer: 'rainy-konbini'
}

export const rainyKonbini: SceneRecord = {
  id: 'scene-001',
  slug: 'rainy-night-konbini',
  title: '雨夜便利店',
  subtitle: '给每一个晚归的人，留一盏灯。',
  description: '雨落在深夜的街角，便利店还亮着暖色的灯。一个没有人物、只有生活痕迹的日式微缩世界，等待你慢慢靠近。',
  tags: ['日式街景', '微缩世界', '雨夜', '三渲二'],
  category: '建筑与空间',
  cover: '/images/rainy-konbini.png',
  prompt: `制作一个精细、可交互的日式雨夜便利店三维微缩场景。

构图与空间
一个完整的正方形厚底座，所有建筑、道路和配件都收纳在底座范围内。便利店居中偏后，前方与侧面道路构成清晰的 L 形街角，保留小巷入口。默认第三人称斜俯视，完整看见店铺和底座。允许旋转、缩放和平移，不添加人物。

建筑与室内
建立真实的建筑与内部空间，不用贴图代替店内。大面积玻璃、窗框、自动门和屋檐，让视线可以穿过窗户看到明亮而充实的内部：多排货架、饮料柜、便当与饭团、零食陈列、收银台、咖啡机、杂志架、海报灯箱、冰柜、关东煮区、地面导视和后场门。

街角细节
包括发光招牌、雨棚、地垫、自动贩卖机、自行车、雨伞架、分类垃圾桶、路灯、电线杆与线缆、路牌、护栏、停车线、排水沟、积水、湿润的斑马线、空调外机和公告栏。物品的尺度、位置与材质应有微缩收藏模型的真实感。

光影与美术
日式动画风格，三渲二、分阶色彩与克制的轮廓线。店内的温暖灯光，与户外冷蓝色雨夜形成对比。玻璃保持通透，让室内陈列可读。地面有潮湿质感、招牌灯光倒影和局部积水。辉光要轻，不遮盖细节。

动态与交互
持续降雨、屋檐滴水、积水涟漪、玻璃雨痕、灯箱轻微闪烁、自动门间歇开合、交通信号变化。动效安静而细微，场景内部没有按钮、文字叠层、性能面板或水印。`,
  promptSource: '需求整理稿：依据已确认的场景要求整理，不是原始提示词的逐字副本。可在资料编辑器中替换为原文。',
  model: '未披露',
  thinking: '未披露',
  agent: '',
  notes: '使用 React Three Fiber 和 Three.js 程序化搭建，场景中的建筑、陈列和街道物件均为真实三维几何。无人物，无在线生成；封面取自场景实际渲染。',
  createdAt: '2026-09-10',
  updatedAt: '2026-09-10',
  renderer: 'rainy-konbini',
}

export const scenes: readonly SceneRecord[] = [rainyKonbini]

export function findScene(slug: string) {
  return scenes.find((scene) => scene.slug === slug)
}

export function formatSceneDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}
