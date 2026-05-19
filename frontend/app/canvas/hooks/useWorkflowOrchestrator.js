/**
 * Workflow Orchestrator Hook | 工作流编排 Hook
 * 使用回调串行结构编排节点执行
 * 
 * 依赖关系：
 * - imageConfig 执行后产生 image 节点
 * - videoConfig 依赖 image 节点作为输入
 * - 串行执行：等待上一步完成后再执行下一步
 */

import { ref, watch } from 'vue'
import { streamChatCompletions } from '~/canvas/api'
import { 
  nodes, 
  addNode, 
  addEdge, 
  updateNode 
} from '~/canvas/stores/canvas'

// Workflow types | 工作流类型
const WORKFLOW_TYPES = {
  TEXT_TO_IMAGE: 'text_to_image',
  TEXT_TO_IMAGE_TO_VIDEO: 'text_to_image_to_video',
  STORYBOARD: 'storyboard', // 分镜工作流
  MULTI_ANGLE_STORYBOARD: 'multi_angle_storyboard', // 多角度分镜工作流
  PICTURE_BOOK: 'picture_book', // 儿童绘本工作流
}

// Multi-angle prompts | 多角度提示词模板
const MULTI_ANGLE_PROMPTS = {
  front: {
    label: '正视',
    english: 'Front View',
    prompt: (character) => `使用提供的图片，生成四宫格分镜，每张四宫格包括人物正面对着镜头的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  side: {
    label: '侧视',
    english: 'Side View', 
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括人物侧面角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  back: {
    label: '后视',
    english: 'Back View',
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括人物背影角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  top: {
    label: '俯视',
    english: 'Top/Bird\'s Eye View',
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括俯视角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  }
}

// System prompt for intent analysis | 意图分析系统提示词
const INTENT_ANALYSIS_PROMPT = `你是一个工作流分析助手。根据用户输入判断需要的工作流类型，并生成对应的提示词。

工作流类型：
1. text_to_image - 用户想要生成单张图片（默认）
2. text_to_image_to_video - 用户想要生成图片并转成视频（包含"视频"、"动画"、"动起来"等关键词）
3. storyboard - 用户想要生成分镜/多场景图片（包含"分镜"、"场景一"、"镜头"等关键词，或描述多个连续场景）
4. multi_angle_storyboard - 用户想要生成多角度分镜（包含"多角度"、"正视"、"侧视"、"后视"、"俯视"、"四宫格"、"景别"等关键词）
5. picture_book - 用户想要生成儿童绘本（包含"绘本"、"故事书"、"童话"、"儿童故事"、"picture book"等关键词）

返回 JSON：
{
  "workflow_type": "text_to_image | text_to_image_to_video | storyboard | multi_angle_storyboard | picture_book",
  "description": "简短描述",

  // text_to_image 和 text_to_image_to_video 使用:
  "image_prompt": "优化后的图片生成提示词",
  "video_prompt": "视频生成提示词（仅 text_to_image_to_video）",

  // storyboard 分镜工作流使用:
  "character": {
    "name": "角色名称",
    "description": "角色外观描述，用于生成参考图"
  },
  "shots": [
    {
      "title": "分镜标题",
      "prompt": "该分镜的详细画面描述，包含角色动作、场景、光影等"
    }
  ],

  // multi_angle_storyboard 多角度分镜工作流使用:
  "multi_angle": {
    "character_description": "角色的详细外观描述，包括服装、发型、体型、特征等"
  },

  // picture_book 儿童绘本工作流使用:
  "picture_book": {
    "title": "绘本标题",
    "style": "插画风格描述，如水彩、蜡笔、扁平插画等",
    "character": {
      "name": "主角名称",
      "description": "主角外观详细描述"
    },
    "pages": [
      {
        "page_number": 1,
        "story_text": "该页的故事文字（给孩子读的）",
        "illustration_prompt": "该页插画的详细描述，包含角色动作、场景、色彩、构图等，需保持风格一致"
      }
    ]
  }
}

提示词优化要求：
- image_prompt: 基于用户输入扩展，添加画面细节、艺术风格、光影效果等
- video_prompt: 描述画面如何动起来，如镜头移动、主体动作、氛围变化等
- character.description: 详细描述角色外观特征，便于后续分镜保持一致性
- shots[].prompt: 每个分镜的完整画面描述，需包含角色名以保持一致性
- multi_angle.character_description: 详细描述角色外观，用于生成多角度四宫格分镜
- picture_book.style: 明确的插画风格，如"温暖水彩风"、"彩色蜡笔风"、"扁平矢量插画"等
- picture_book.character.description: 详细描述主角外观特征，确保每页插画角色一致
- picture_book.pages[].story_text: 简洁温馨的儿童故事文字，适合3-8岁孩子阅读
- picture_book.pages[].illustration_prompt: 详细的插画描述，必须包含角色名和外观特征、场景、动作、色调，并注明插画风格以保持全书一致

示例1 - 分镜工作流:
输入: "蜡笔小新去上学。分镜一：清晨的战争；分镜二：出发的风姿"
输出:
{
  "workflow_type": "storyboard",
  "description": "蜡笔小新上学分镜",
  "character": {
    "name": "蜡笔小新",
    "description": "5岁男孩，黑色蘑菇头发型，粗眉毛，穿红色T恤和黄色短裤，卡通动漫风格"
  },
  "shots": [
    {"title": "清晨的战争", "prompt": "蜡笔小新在卧室赖床，妈妈美伢在旁边生气催促..."},
    {"title": "出发的风姿", "prompt": "蜡笔小新背着黄色书包，在阳光下昂首阔步走出家门..."}
  ]
}

示例2 - 多角度分镜工作流:
输入: "生成一个穿红裙子的女孩的多角度分镜"
输出:
{
  "workflow_type": "multi_angle_storyboard",
  "description": "红裙女孩多角度分镜",
  "multi_angle": {
    "character_description": "年轻女孩，长发飘逸，穿着优雅的红色连衣裙，白皙皮肤，精致五官，现代时尚风格"
  }
}

示例3 - 儿童绘本工作流:
输入: "小兔子找妈妈的绘本故事"
输出:
{
  "workflow_type": "picture_book",
  "description": "小兔子找妈妈绘本",
  "picture_book": {
    "title": "小兔子找妈妈",
    "style": "温暖水彩风，柔和色调，圆润线条，儿童绘本插画风格",
    "character": {
      "name": "小兔子",
      "description": "一只白色小兔子，圆圆的大眼睛，粉色的长耳朵，穿着蓝色小背带裤，毛茸茸的短尾巴"
    },
    "pages": [
      {"page_number": 1, "story_text": "清晨，小兔子醒来发现妈妈不在身边。", "illustration_prompt": "温暖水彩风，一只穿蓝色背带裤的白色小兔子坐在小床上揉眼睛，阳光从窗户洒进温馨的小房间，柔和的暖色调，儿童绘本插画风格"},
      {"page_number": 2, "story_text": "小兔子来到花园里，问蝴蝶姐姐：'你看到我妈妈了吗？'", "illustration_prompt": "温暖水彩风，穿蓝色背带裤的白色小兔子站在五彩缤纷的花园中，仰头看着一只彩色蝴蝶，绿草如茵，鲜花盛开，明亮温暖的色调，儿童绘本插画风格"},
      {"page_number": 3, "story_text": "小兔子终于在胡萝卜地里找到了妈妈，开心地扑进妈妈怀里。", "illustration_prompt": "温暖水彩风，穿蓝色背带裤的白色小兔子扑进兔妈妈怀里，兔妈妈穿着围裙温柔地抱着小兔子，周围是橙色的胡萝卜地，温馨幸福的画面，柔和暖色调，儿童绘本插画风格"}
    ]
  }
}

返回纯 JSON，不要其他内容。`

/**
 * Workflow Orchestrator Composable
 */
export const useWorkflowOrchestrator = () => {
  // State | 状态
  const isAnalyzing = ref(false)
  const isExecuting = ref(false)
  const currentStep = ref(0)
  const totalSteps = ref(0)
  const executionLog = ref([])
  
  // Active watchers | 活跃的监听器
  const activeWatchers = []
  
  /**
   * Add log entry | 添加日志
   */
  const addLog = (type, message) => {
    executionLog.value.push({ type, message, timestamp: Date.now() })
    console.log(`[Workflow ${type}] ${message}`)
  }
  
  /**
   * Clear all watchers | 清除所有监听器
   */
  const clearWatchers = () => {
    activeWatchers.forEach(stop => stop())
    activeWatchers.length = 0
  }
  
  /**
   * Wait for config node to complete and return output node ID
   * 等待配置节点完成并返回输出节点 ID
   */
  const waitForConfigComplete = (configNodeId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('执行超时'))
      }, 5 * 60 * 1000)
      
      let stopWatcher = null
      
      const checkNode = (node) => {
        if (!node) return false
        
        // Check for error | 检查错误
        if (node.data?.error) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          reject(new Error(node.data.error))
          return true
        }
        
        // Config node completed with output node ID | 配置节点完成并返回输出节点 ID
        if (node.data?.executed && node.data?.outputNodeId) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          addLog('success', `节点 ${configNodeId} 完成，输出节点: ${node.data.outputNodeId}`)
          resolve(node.data.outputNodeId)
          return true
        }
        return false
      }
      
      // Check immediately first | 先立即检查一次
      const node = nodes.value.find(n => n.id === configNodeId)
      if (checkNode(node)) return
      
      // Then watch for changes | 然后监听变化
      stopWatcher = watch(
        () => nodes.value.find(n => n.id === configNodeId),
        (node) => checkNode(node),
        { deep: true }
      )
      
      activeWatchers.push(stopWatcher)
    })
  }
  
  /**
   * Wait for output node (image/video) to be ready
   * 等待输出节点准备好
   */
  const waitForOutputReady = (outputNodeId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('输出节点超时'))
      }, 5 * 60 * 1000)
      
      let stopWatcher = null
      
      const checkNode = (node) => {
        if (!node) return false
        
        if (node.data?.error) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          reject(new Error(node.data.error))
          return true
        }
        
        // Output node ready when has URL and not loading
        if (node.data?.url && !node.data?.loading) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          addLog('success', `输出节点 ${outputNodeId} 已就绪`)
          resolve(node)
          return true
        }
        return false
      }
      
      // Check immediately first | 先立即检查一次
      const node = nodes.value.find(n => n.id === outputNodeId)
      if (checkNode(node)) return
      
      // Then watch for changes | 然后监听变化
      stopWatcher = watch(
        () => nodes.value.find(n => n.id === outputNodeId),
        (node) => checkNode(node),
        { deep: true }
      )
      
      activeWatchers.push(stopWatcher)
    })
  }
  
  /**
   * Analyze user intent | 分析用户意图
   */
  const analyzeIntent = async (userInput) => {
    isAnalyzing.value = true
    
    try {
      let response = ''
      for await (const chunk of streamChatCompletions({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: INTENT_ANALYSIS_PROMPT },
          { role: 'user', content: userInput }
        ]
      })) {
        response += chunk
      }
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE }
      }
      
      return JSON.parse(jsonMatch[0])
    } catch (err) {
      addLog('error', `分析失败: ${err.message}`)
      return { workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE }
    } finally {
      isAnalyzing.value = false
    }
  }
  
  /**
   * Execute text-to-image workflow | 执行文生图工作流
   * text → imageConfig (autoExecute) → image
   */
  const executeTextToImage = async (imagePrompt, position) => {
    const nodeSpacing = 400
    let x = position.x
    
    addLog('info', '开始执行文生图工作流')
    currentStep.value = 1
    totalSteps.value = 2
    
    // Step 1: Create text node for image | 创建图片提示词节点
    const textNodeId = addNode('text', { x, y: position.y }, {
      content: imagePrompt,
      label: '图片提示词'
    })
    addLog('info', `创建图片提示词节点: ${textNodeId}`)
    x += nodeSpacing
    
    // Step 2: Create imageConfig with autoExecute | 创建图片配置节点并自动执行
    currentStep.value = 2
    const imageConfigId = addNode('imageConfig', { x, y: position.y }, {
      label: '文生图',
      autoExecute: true
    })
    addLog('info', `创建图片配置节点: ${imageConfigId}`)
    
    // Connect text → imageConfig
    addEdge({
      source: textNodeId,
      target: imageConfigId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    
    addLog('success', '文生图工作流已启动')
    return { textNodeId, imageConfigId }
  }
  
  /**
   * Execute text-to-image-to-video workflow | 执行文生图生视频工作流
   * imageText → imageConfig → image
   * videoText → videoConfig → video
   *              image → videoConfig
   */
  const executeTextToImageToVideo = async (imagePrompt, videoPrompt, position) => {
    const nodeSpacing = 400
    const rowSpacing = 200
    let x = position.x
    
    addLog('info', '开始执行文生图生视频工作流')
    currentStep.value = 1
    totalSteps.value = 5
    
    // Step 1: Create image prompt text node | 创建图片提示词节点
    const imageTextNodeId = addNode('text', { x, y: position.y }, {
      content: imagePrompt,
      label: '图片提示词'
    })
    addLog('info', `创建图片提示词节点: ${imageTextNodeId}`)
    
    // Step 2: Create video prompt text node (below image prompt) | 创建视频提示词节点
    currentStep.value = 2
    const videoTextNodeId = addNode('text', { x, y: position.y + rowSpacing }, {
      content: videoPrompt,
      label: '视频提示词'
    })
    addLog('info', `创建视频提示词节点: ${videoTextNodeId}`)
    x += nodeSpacing
    
    // Step 3: Create imageConfig with autoExecute | 创建图片配置节点
    currentStep.value = 3
    const imageConfigId = addNode('imageConfig', { x, y: position.y }, {
      label: '文生图',
      autoExecute: true
    })
    addLog('info', `创建图片配置节点: ${imageConfigId}`)
    
    // Connect imageText → imageConfig
    addEdge({
      source: imageTextNodeId,
      target: imageConfigId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    
    // Step 3: Wait for imageConfig to complete and get image node ID
    // 等待图片配置完成并获取图片节点 ID
    currentStep.value = 3
    addLog('info', '等待图片生成完成...')
    
    try {
      const imageNodeId = await waitForConfigComplete(imageConfigId)
      
      // Wait for image to be ready | 等待图片准备好
      await waitForOutputReady(imageNodeId)
      
      // Get image node position | 获取图片节点位置
      const imageNode = nodes.value.find(n => n.id === imageNodeId)
      x = (imageNode?.position?.x || x) + nodeSpacing
      
      // Step 4: Create videoConfig connected to videoText and image nodes
      // 创建视频配置节点，连接视频提示词和图片节点
      currentStep.value = 4
      const videoConfigId = addNode('videoConfig', { x, y: position.y + rowSpacing }, {
        label: '图生视频',
        autoExecute: true
      })
      addLog('info', `创建视频配置节点: ${videoConfigId}`)
      
      // Connect videoText → videoConfig (for video prompt)
      addEdge({
        source: videoTextNodeId,
        target: videoConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // Connect image → videoConfig (for image input)
      addEdge({
        source: imageNodeId,
        target: videoConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      addLog('success', '文生图生视频工作流已启动')
      return { imageTextNodeId, videoTextNodeId, imageConfigId, imageNodeId, videoConfigId }
    } catch (err) {
      addLog('error', `工作流执行失败: ${err.message}`)
      throw err
    }
  }
  
  /**
   * Execute storyboard workflow | 执行分镜工作流
   * 
   * 布局结构:
   * [角色描述] → [imageConfig] → [角色参考图]
   *                                    ↓
   * [分镜1文本] → [imageConfig] → [分镜1图片]
   * [分镜2文本] → [imageConfig] → [分镜2图片]
   * ...
   */
  const executeStoryboard = async (character, shots, position) => {
    const nodeSpacing = 400
    const rowSpacing = 250
    let x = position.x
    let y = position.y
    
    const shotCount = shots?.length || 0
    addLog('info', `开始执行分镜工作流: ${character?.name || '未知角色'}, ${shotCount} 个分镜`)
    currentStep.value = 1
    totalSteps.value = 2 + shotCount * 2 // 角色生成 + 每个分镜(文本+生成)
    
    const createdNodes = {
      characterTextId: null,
      characterConfigId: null,
      characterImageId: null,
      shots: []
    }
    
    try {
      // Step 1: Create character description text node | 创建角色描述文本节点
      const characterDesc = `${character?.name || '角色'}: ${character?.description || ''}`
      createdNodes.characterTextId = addNode('text', { x, y }, {
        content: characterDesc,
        label: `角色: ${character?.name || '参考'}`
      })
      addLog('info', `创建角色描述节点: ${createdNodes.characterTextId}`)
      x += nodeSpacing
      
      // Step 2: Create character imageConfig with autoExecute | 创建角色参考图配置
      currentStep.value = 2
      createdNodes.characterConfigId = addNode('imageConfig', { x, y }, {
        label: '角色参考图',
        autoExecute: true
      })
      addLog('info', `创建角色配置节点: ${createdNodes.characterConfigId}`)
      
      // Connect character text → imageConfig
      addEdge({
        source: createdNodes.characterTextId,
        target: createdNodes.characterConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // Wait for character image to complete | 等待角色参考图完成
      addLog('info', '等待角色参考图生成...')
      createdNodes.characterImageId = await waitForConfigComplete(createdNodes.characterConfigId)
      await waitForOutputReady(createdNodes.characterImageId)
      addLog('success', '角色参考图已生成')
      
      // Get character image position for layout | 获取角色图位置用于布局
      const charImageNode = nodes.value.find(n => n.id === createdNodes.characterImageId)
      x = (charImageNode?.position?.x || x) + nodeSpacing
      
      // Step 3+: Create each shot | 创建每个分镜
      for (let i = 0; i < shotCount; i++) {
        const shot = shots[i]
        const shotY = y + (i + 1) * rowSpacing
        let shotX = position.x
        
        currentStep.value = 3 + i * 2
        
        // Create shot text node | 创建分镜文本节点
        const shotTextId = addNode('text', { x: shotX, y: shotY }, {
          content: shot.prompt,
          label: `分镜${i + 1}: ${shot.title}`
        })
        addLog('info', `创建分镜${i + 1}文本节点: ${shotTextId}`)
        shotX += nodeSpacing
        
        // Create shot imageConfig | 创建分镜配置节点
        currentStep.value = 4 + i * 2
        const shotConfigId = addNode('imageConfig', { x: shotX, y: shotY }, {
          label: `分镜${i + 1}`,
          autoExecute: true
        })
        addLog('info', `创建分镜${i + 1}配置节点: ${shotConfigId}`)
        
        // Connect shot text → imageConfig
        addEdge({
          source: shotTextId,
          target: shotConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // Connect character image → shot imageConfig (as reference)
        addEdge({
          source: createdNodes.characterImageId,
          target: shotConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // Wait for this shot to complete before next | 等待当前分镜完成
        addLog('info', `等待分镜${i + 1}生成...`)
        const shotImageId = await waitForConfigComplete(shotConfigId)
        await waitForOutputReady(shotImageId)
        addLog('success', `分镜${i + 1}已生成`)
        
        createdNodes.shots.push({
          textId: shotTextId,
          configId: shotConfigId,
          imageId: shotImageId,
          title: shot.title
        })
      }
      
      addLog('success', `分镜工作流完成，共生成 ${shotCount} 个分镜`)
      return createdNodes
    } catch (err) {
      addLog('error', `分镜工作流执行失败: ${err.message}`)
      throw err
    }
  }
  
  /**
   * Execute multi-angle storyboard workflow | 执行多角度分镜工作流
   * 
   * 布局结构:
   * [主角色图] ──┬──> [正视提示词] → [imageConfig] → [正视四宫格]
   *              ├──> [侧视提示词] → [imageConfig] → [侧视四宫格]
   *              ├──> [后视提示词] → [imageConfig] → [后视四宫格]
   *              └──> [俯视提示词] → [imageConfig] → [俯视四宫格]
   * 
   * @param {object} multiAngle - 多角度参数 { character_description }
   * @param {object} position - 起始位置
   */
  const executeMultiAngleStoryboard = async (multiAngle, position) => {
    const nodeSpacing = 400
    const rowSpacing = 300
    let x = position.x
    let y = position.y
    
    const characterDesc = multiAngle?.character_description || ''
    const angles = ['front', 'side', 'back', 'top']
    
    addLog('info', `开始执行多角度分镜工作流: ${characterDesc.slice(0, 30)}...`)
    currentStep.value = 1
    totalSteps.value = 2 + angles.length * 2 // 角色图 + 每个角度(提示词+生成)
    
    const createdNodes = {
      characterImageId: null,
      angles: []
    }
    
    try {
      // Step 1: Create character image node (user uploads or existing)
      // 创建角色图节点（用户上传或已有）
      const characterImageId = addNode('image', { x, y }, {
        url: '',
        label: '主角色图（请上传）',
        isCharacterRef: true
      })
      createdNodes.characterImageId = characterImageId
      addLog('info', `创建主角色图节点: ${characterImageId}`)
      
      // Step 2: Create 4 angle nodes in parallel layout
      // 创建4个角度的节点（并行布局）
      const angleX = x + nodeSpacing + 100
      
      for (let i = 0; i < angles.length; i++) {
        const angleKey = angles[i]
        const angleConfig = MULTI_ANGLE_PROMPTS[angleKey]
        const angleY = y + i * rowSpacing
        let currentX = angleX
        
        currentStep.value = 2 + i * 2
        
        // Create angle prompt text node | 创建角度提示词节点
        const promptContent = angleConfig.prompt(characterDesc)
        const textNodeId = addNode('text', { x: currentX, y: angleY }, {
          content: promptContent,
          label: `${angleConfig.label}提示词`
        })
        addLog('info', `创建${angleConfig.label}提示词节点: ${textNodeId}`)
        currentX += nodeSpacing
        
        // Create imageConfig node | 创建图片配置节点
        currentStep.value = 3 + i * 2
        const configNodeId = addNode('imageConfig', { x: currentX, y: angleY }, {
          label: `${angleConfig.label} (${angleConfig.english})`,
          autoExecute: false // 不自动执行，等待用户上传角色图
        })
        addLog('info', `创建${angleConfig.label}配置节点: ${configNodeId}`)
        
        // Connect text → imageConfig
        addEdge({
          source: textNodeId,
          target: configNodeId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // Connect character image → imageConfig (as reference)
        addEdge({
          source: characterImageId,
          target: configNodeId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        createdNodes.angles.push({
          key: angleKey,
          label: angleConfig.label,
          english: angleConfig.english,
          textId: textNodeId,
          configId: configNodeId,
          imageId: null
        })
      }
      
      addLog('success', `多角度分镜工作流已创建，请上传主角色图后点击各节点的"立即生成"按钮`)
      window.$message?.info('请先上传主角色图，然后点击各角度节点的"立即生成"按钮')
      
      return createdNodes
    } catch (err) {
      addLog('error', `多角度分镜工作流执行失败: ${err.message}`)
      throw err
    }
  }

  /**
   * Wait for LLM config node to complete (outputContent ready)
   * 等待 LLM 配置节点完成（outputContent 就绪）
   */
  const waitForLLMComplete = (llmNodeId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('LLM 执行超时'))
      }, 5 * 60 * 1000)

      let stopWatcher = null

      const checkNode = (node) => {
        if (!node) return false

        if (node.data?.error) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          reject(new Error(node.data.error))
          return true
        }

        if (node.data?.executed && node.data?.outputContent) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          addLog('success', `LLM 节点 ${llmNodeId} 完成`)
          resolve(node.data.outputContent)
          return true
        }
        return false
      }

      const node = nodes.value.find(n => n.id === llmNodeId)
      if (checkNode(node)) return

      stopWatcher = watch(
        () => nodes.value.find(n => n.id === llmNodeId),
        (node) => checkNode(node),
        { deep: true }
      )

      activeWatchers.push(stopWatcher)
    })
  }

  /**
   * Execute picture book workflow | 执行儿童绘本工作流
   *
   * 布局结构:
   * [故事主题] → [LLM角色生成] → [角色参考图 imageConfig] → [角色图]
   *                                                            ↓
   *              [LLM页面1提示词] → [imageConfig] → [绘本页1]
   *              [LLM页面2提示词] → [imageConfig] → [绘本页2]
   *              ...
   *
   * 每页同时生成故事文字(text节点)和插画
   */
  const executePictureBook = async (pictureBook, position) => {
    const nodeSpacing = 420
    const rowSpacing = 280
    let x = position.x
    let y = position.y

    const { title, style, character, pages } = pictureBook
    const pageCount = pages?.length || 0

    addLog('info', `开始执行儿童绘本工作流: ${title}, ${pageCount} 页`)
    currentStep.value = 1
    totalSteps.value = 2 + pageCount * 2

    const createdNodes = {
      characterLLMId: null,
      characterConfigId: null,
      characterImageId: null,
      pages: []
    }

    try {
      // Step 1: Create LLM node for character description → generate character reference image
      // 创建角色描述 LLM 节点 → 生成角色参考图
      const characterPrompt = `${character?.name || '角色'}: ${character?.description || ''}\n\n插画风格: ${style || '儿童绘本插画'}`
      const characterTextId = addNode('text', { x, y }, {
        content: characterPrompt,
        label: `角色设定: ${character?.name || '主角'}`
      })
      addLog('info', `创建角色描述节点: ${characterTextId}`)
      x += nodeSpacing

      // Create imageConfig for character reference | 创建角色参考图配置
      currentStep.value = 2
      createdNodes.characterConfigId = addNode('imageConfig', { x, y }, {
        label: `${character?.name || '角色'}参考图`,
        autoExecute: true
      })
      addLog('info', `创建角色参考图配置: ${createdNodes.characterConfigId}`)

      addEdge({
        source: characterTextId,
        target: createdNodes.characterConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })

      // Wait for character image | 等待角色参考图
      addLog('info', '等待角色参考图生成...')
      createdNodes.characterImageId = await waitForConfigComplete(createdNodes.characterConfigId)
      await waitForOutputReady(createdNodes.characterImageId)
      addLog('success', '角色参考图已生成')

      // Step 3+: Create each page | 创建每一页
      for (let i = 0; i < pageCount; i++) {
        const page = pages[i]
        const pageY = y + (i + 1) * rowSpacing
        let pageX = position.x

        currentStep.value = 3 + i * 2

        // Create story text node for this page | 创建该页故事文字节点
        const storyTextId = addNode('text', { x: pageX, y: pageY - 80 }, {
          content: page.story_text,
          label: `第${page.page_number}页 故事文字`
        })
        addLog('info', `创建第${page.page_number}页故事文字: ${storyTextId}`)

        // Create illustration prompt text node | 创建插画提示词节点
        const illustrationPromptId = addNode('text', { x: pageX, y: pageY + 40 }, {
          content: page.illustration_prompt,
          label: `第${page.page_number}页 插画提示词`
        })
        addLog('info', `创建第${page.page_number}页插画提示词: ${illustrationPromptId}`)
        pageX += nodeSpacing

        // Create imageConfig for this page | 创建该页图片配置
        currentStep.value = 4 + i * 2
        const pageConfigId = addNode('imageConfig', { x: pageX, y: pageY }, {
          label: `绘本第${page.page_number}页`,
          autoExecute: true
        })
        addLog('info', `创建第${page.page_number}页图片配置: ${pageConfigId}`)

        // Connect illustration prompt → imageConfig
        addEdge({
          source: illustrationPromptId,
          target: pageConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })

        // Connect character image → imageConfig (as reference for consistency)
        addEdge({
          source: createdNodes.characterImageId,
          target: pageConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })

        // Wait for page image | 等待该页插画完成
        addLog('info', `等待第${page.page_number}页插画生成...`)
        const pageImageId = await waitForConfigComplete(pageConfigId)
        await waitForOutputReady(pageImageId)
        addLog('success', `第${page.page_number}页插画已生成`)

        createdNodes.pages.push({
          storyTextId,
          illustrationPromptId,
          configId: pageConfigId,
          imageId: pageImageId,
          pageNumber: page.page_number
        })
      }

      addLog('success', `绘本工作流完成: ${title}，共 ${pageCount} 页`)
      return createdNodes
    } catch (err) {
      addLog('error', `绘本工作流执行失败: ${err.message}`)
      throw err
    }
  }

  /**
   * 根据工作流类型执行
   * @param {object} params - 工作流参数
   * @param {object} position - 起始位置
   */
  const executeWorkflow = async (params, position) => {
    isExecuting.value = true
    clearWatchers()
    executionLog.value = []
    
    const { workflow_type, image_prompt, video_prompt, character, shots, multi_angle, picture_book } = params

    try {
      switch (workflow_type) {
        case WORKFLOW_TYPES.PICTURE_BOOK:
          return await executePictureBook(picture_book, position)
        case WORKFLOW_TYPES.MULTI_ANGLE_STORYBOARD:
          return await executeMultiAngleStoryboard(multi_angle, position)
        case WORKFLOW_TYPES.STORYBOARD:
          return await executeStoryboard(character, shots, position)
        case WORKFLOW_TYPES.TEXT_TO_IMAGE_TO_VIDEO:
          return await executeTextToImageToVideo(image_prompt, video_prompt, position)
        case WORKFLOW_TYPES.TEXT_TO_IMAGE:
        default:
          return await executeTextToImage(image_prompt, position)
      }
    } finally {
      isExecuting.value = false
      clearWatchers()
    }
  }
  
  /**
   * Convenience method for simple text-to-image | 简便方法
   */
  const createTextToImageWorkflow = (imagePrompt, position) => {
    return executeWorkflow({ 
      workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE, 
      image_prompt: imagePrompt 
    }, position)
  }
  
  /**
   * Convenience method for multi-angle storyboard | 多角度分镜简便方法
   */
  const createMultiAngleStoryboard = (characterDescription, position) => {
    return executeWorkflow({
      workflow_type: WORKFLOW_TYPES.MULTI_ANGLE_STORYBOARD,
      multi_angle: { character_description: characterDescription }
    }, position)
  }

  /**
   * Convenience method for picture book | 儿童绘本简便方法
   */
  const createPictureBook = (pictureBookParams, position) => {
    return executeWorkflow({
      workflow_type: WORKFLOW_TYPES.PICTURE_BOOK,
      picture_book: pictureBookParams
    }, position)
  }

  /**
   * Reset state | 重置状态
   */
  const reset = () => {
    isAnalyzing.value = false
    isExecuting.value = false
    currentStep.value = 0
    totalSteps.value = 0
    executionLog.value = []
    clearWatchers()
  }
  
  return {
    // State
    isAnalyzing,
    isExecuting,
    currentStep,
    totalSteps,
    executionLog,
    
    // Methods
    analyzeIntent,
    executeWorkflow,
    createTextToImageWorkflow,
    createMultiAngleStoryboard,
    createPictureBook,
    reset,
    
    // Constants
    WORKFLOW_TYPES,
    MULTI_ANGLE_PROMPTS
  }
}

export default useWorkflowOrchestrator
