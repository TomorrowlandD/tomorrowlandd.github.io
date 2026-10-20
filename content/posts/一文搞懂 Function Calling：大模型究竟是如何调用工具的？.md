---
title: "一文搞懂 Function Calling：大模型究竟是如何调用工具的？"
date: "2026-10-20"
category: "Agent"
tags: ["Agent"]
slug: "function-calling"
draft: false
---

我们知道，传统的大语言模型（LLM）主要负责理解和生成文本。

但是，像 Claude Code、Codex 这样的 AI Agent，不仅能够回答问题，还可以读取文件、执行终端命令、搜索网页，甚至修改整个项目的代码。

这就引出了一个问题：

**大语言模型明明只是根据上下文预测下一个 Token，为什么它能够调用外部工具，完成这些实际操作？**

答案就与本文的主角——**Function Calling（函数调用）**有关。

本文将从一个简单的例子出发，逐步解释 Function Calling 的工作原理，以及它与 JSON Schema、MCP、Agent Harness 之间的关系。

## 一、为什么大语言模型需要 Function Calling？

假设我们向一个没有联网和工具能力的大模型提问：

> 北京现在的天气怎么样？

模型可以根据已有知识解释北京的气候特点，但它无法仅凭模型参数准确获得此时此刻的天气。

原因很简单：**模型的内部知识不等于实时的外部世界信息。**

如果我们希望模型回答实时天气，就必须让它能够借助外部天气 API。

传统程序实现起来并不困难：

```
def get_weather(city):
    # 调用天气 API
    return weather_api(city)
```

真正的问题是：用户使用的是自然语言，而程序需要明确的函数名称和参数。

例如，用户可能说：

+ 北京现在天气怎么样？
+ 帮我查一下北京的气温。
+ 我今天出门需不需要带伞？

虽然表达不同，但这些问题都可能需要调用 `get_weather`。

我们希望大模型能够理解这些不同的表达，并自动决定是否调用工具。

这正是 Function Calling 要解决的问题。

## 二、Function Calling 出现之前，如何让模型使用工具？

早期的大模型应用主要依赖 Prompt Engineering，让模型按照特定格式输出工具调用指令。

例如，在 Prompt 中告诉模型：

> 当用户需要查询天气时，请输出 `ACTION: get_weather("Beijing")`，不要直接回答。

随后，开发者编写程序解析模型输出：

```
用户：北京现在多少度？

模型：
ACTION: get_weather("Beijing")

应用程序：
解析 ACTION → 执行 get_weather → 返回结果

模型：
北京当前气温为 22°C。
```

*注：22°C 仅作为流程演示数据，不代表实时天气。*

这种方式可以工作，但也存在明显的问题：

1. **格式不可靠**：模型可能输出错误的工具名称或参数格式。
2. **解析成本高**：开发者需要自行编写解析和容错逻辑。
3. **行为不稳定**：不同模型、不同 Prompt 下的工具调用表现可能差异较大。

ReAct（Reasoning + Acting）等早期 Agent 方法也探索了模型推理与外部行动的交替执行。需要注意，ReAct 是一种推理与行动的组织范式，并不等同于某种特定的文本解析方案。

### 2023 年：原生 Function Calling 出现

2023 年 6 月 13 日，OpenAI 正式在 API 中推出 Function Calling 能力。

开发者可以直接向 API 提供工具定义，模型则能够生成结构化的工具调用信息。

这意味着工具调用不再完全依赖开发者在 Prompt 中约定文本格式，而成为模型 API 原生支持的能力。

此后，Anthropic、Google 等厂商也提供了类似的工具调用接口。

## 三、Function Calling 究竟是什么？

先给出一个定义：

**Function Calling 是一种让大语言模型能够选择工具、生成结构化调用请求，并通过外部执行环境使用工具的机制。**

它的核心是将一次工具调用拆分成两个部分：

+ **模型负责决策**：是否需要调用工具、选择哪个工具、使用什么参数。
+ **外部程序负责执行**：接收调用请求，执行实际函数，并将结果返回给模型。

例如，模型可能生成：

```
{
  "name": "get_weather",
  "arguments": {
    "city": "Beijing"
  }
}
```

这段 JSON 表示：

> 我希望调用 `get_weather`，并将 `city` 参数设置为 `Beijing`。

但这里有一个非常重要的区别：

**模型生成工具调用请求，不等于工具已经被执行。**

在典型的自定义 Function Calling 场景中，真正调用天气 API 的仍然是外部程序。

当然，一些模型平台也提供服务端托管工具，能够自动执行部分工具调用。这属于具体平台提供的执行能力，并不改变 Function Calling 的基本思想。

## 四、Function Calling 的完整工作流程

一次典型的 Function Calling，可以分成四个阶段。

### 第一步：开发者定义工具

首先，我们需要告诉模型有哪些工具，以及每个工具应该如何使用。

例如，定义一个天气查询工具：

```
{
  "name": "get_weather",
  "description": "查询指定城市的实时天气",
  "parameters": {
    "type": "object",
    "properties": {
      "city": {
        "type": "string",
        "description": "城市名称，例如 Beijing"
      }
    },
    "required": ["city"]
  }
}
```

这个例子包含三个重要字段：

| 字段          | 作用                     |
| ------------- | ------------------------ |
| `name`        | 告诉模型工具的名称       |
| `description` | 描述工具的作用和适用场景 |
| `parameters`  | 定义工具的输入参数及约束 |

其中，`parameters` 使用了 JSON Schema 风格的数据结构。

JSON Schema 的作用是描述 JSON 数据应该符合怎样的结构，例如：

+ `type`：字段的数据类型。
+ `properties`：对象具有哪些字段。
+ `required`：哪些字段必须提供。
+ `enum`：字段只能使用哪些候选值。

需要注意，上面的代码是简化的工具描述，并不是所有模型厂商都能直接接受的完整 API 请求格式。

### 第二步：模型决定是否调用工具

当用户输入：

> 帮我查一下北京现在的天气。

模型会结合用户请求和已有工具定义，判断是否需要使用 `get_weather`。

如果需要，模型就会生成一条结构化调用请求。

注意，模型并不是机械地根据关键词匹配函数名称，而是基于上下文和工具描述选择工具。

因此，清晰的工具描述非常重要。

### 第三步：外部程序执行工具

应用程序收到调用请求后，解析工具名称与参数，执行对应函数。

例如：

```
name = "get_weather"
arguments = {"city": "Beijing"}

if name == "get_weather":
    result = get_weather(**arguments)
```

这里真正执行查询操作的是 Python 程序，而不是语言模型本身。

实际工程中，还需要在执行前校验参数、判断权限并限制可调用的工具。

### 第四步：把执行结果返回模型

假设天气 API 返回：

```
{
  "city": "Beijing",
  "temperature": 22,
  "condition": "晴"
}
```

应用程序会将执行结果作为工具响应提供给模型。

模型结合结果，生成自然语言回答：

> 北京当前气温为 22°C，天气晴朗。

这样，我们就完成了一次完整的工具调用。

**整个流程可以概括为：**

```
                  用户提出问题
                       │
                       ▼
                 大语言模型 LLM
                       │
                判断是否需要工具
                       │
                       ▼
                 生成 Tool Call
                       │
                       ▼
                  Agent 应用程序
                       │
                 解析与校验参数
                       │
                       ▼
                   执行工具
                       │
                       ▼
                   返回结果
                       │
                       ▼
                 大语言模型 LLM
                       │
                       ▼
                  生成最终回答
```

如果模型获得结果后仍然需要更多信息，可以继续生成新的工具调用请求。

这种多轮交互，是很多 Agent 系统的重要基础。

## 五、各家模型的 Function Calling 是统一协议吗？

理解了基本原理之后，还有一个容易混淆的问题：

**不同厂商的 Function Calling，是否使用同一套标准协议？**

答案是：并没有。

Function Calling 是一种通用技术机制，但不存在所有模型厂商都必须遵循的唯一 Function Calling API 协议。

目前值得重点了解的三种主流实现风格是：

1. OpenAI Function Calling
2. Anthropic Tool Use
3. Google Gemini Function Calling

这三种实现的核心思路相同，但 API 数据结构不完全一致。

### 1. OpenAI 风格

以 OpenAI Responses API 为例，模型生成的函数调用信息可以具有以下形式：

```
{
  "type": "function_call",
  "name": "get_weather",
  "arguments": "{\"city\":\"Beijing\"}",
  "call_id": "call_123"
}
```

需要注意：

+ `name` 表示调用的工具。
+ `arguments` 包含调用参数，采用 JSON 字符串表示。
+ `call_id` 用于关联调用请求及其执行结果。

OpenAI 的 Chat Completions API 则采用另一种消息结构，使用 `tool_calls` 表示工具调用。

因此，即使是同一家厂商，不同 API 也可能具有不同的调用格式。

### 2. Anthropic 风格

Anthropic Claude 使用 Tool Use 机制。

模型生成的工具调用，通常以 `tool_use` 内容块表示：

```
{
  "type": "tool_use",
  "id": "toolu_123",
  "name": "get_weather",
  "input": {
    "city": "Beijing"
  }
}
```

它与 OpenAI 的一个显著区别是：

**Anthropic 的** `**input**` **通常直接是对象，而 OpenAI 的** `**arguments**` **通常是 JSON 字符串。**

工具执行结果则使用 `tool_result` 内容块返回。

### 3. Google Gemini 风格

Google Gemini 也提供原生函数调用能力。

在 Gemini GenerateContent API 中，工具调用信息可以采用以下结构：

```
{
  "functionCall": {
    "name": "get_weather",
    "args": {
      "city": "Beijing"
    }
  }
}
```

其中：

+ `functionCall` 表示函数调用。
+ `name` 表示工具名称。
+ `args` 表示参数对象。
+ `functionResponse` 用于返回工具执行结果。

需要注意，新版本 Gemini 的函数调用也可以包含调用 ID，不能简单认为 Gemini 只能根据工具名称匹配调用与结果。

Google 提供的不同 API 形式，也可能采用不同的数据封装方式。

### 4. 三家 API 格式对比

以下对比的是 OpenAI Responses API、Anthropic Messages API 和 Gemini GenerateContent API 中具有代表性的调用结构。

| 对比维度    | OpenAI                 | Anthropic      | Gemini                 |
| ----------- | ---------------------- | -------------- | ---------------------- |
| 工具定义    | `tools`                | `tools`        | `functionDeclarations` |
| 参数 Schema | `parameters`           | `input_schema` | `parameters`           |
| 工具调用    | `function_call`        | `tool_use`     | `functionCall`         |
| 调用参数    | `arguments`            | `input`        | `args`                 |
| 参数表示    | JSON 字符串            | 对象           | 对象                   |
| 执行结果    | `function_call_output` | `tool_result`  | `functionResponse`     |
| 多工具调用  | 支持                   | 支持           | 支持                   |

尽管格式存在差异，三者都遵循类似的逻辑：

**工具定义 → 模型生成调用 → 执行工具 → 返回结果 → 模型继续处理。**

另外，大量第三方模型服务选择兼容 OpenAI API，因此实际开发中经常会遇到 OpenAI 兼容格式。

但“兼容 OpenAI API”不代表所有高级工具调用特性都完全一致，仍需检查具体服务的支持情况。

## 六、JSON Schema 是否保证模型一定正确调用工具？

前面提到了 JSON Schema，它可以帮助描述参数结构，但这里需要区分两个概念：

**参数格式正确，不代表工具调用决策一定正确。**

例如，我们要求 `get_weather` 的 `city` 参数必须是字符串。

模型输出：

```
{
  "city": "Beijing"
}
```

即使完全符合 Schema，也不代表用户真正想查询的城市就是北京。

JSON Schema 主要约束参数结构，并不直接保证：

+ 模型选择了正确的工具。
+ 模型理解了用户的真实意图。
+ 模型提供了语义正确的参数。
+ 外部工具能够成功执行。

部分模型 API 提供严格模式，通过受约束解码等技术增强结构化输出的可靠性。

但这些能力的支持情况和限制取决于具体接口，不能认为所有 Function Calling 都默认具有完全相同的格式保证。

所以，在生产环境中，仍然需要进行参数校验、错误处理与权限控制。

## 七、Function Calling 与 MCP 有什么区别？

学习 Agent 开发时，经常还会遇到另一个概念：MCP（Model Context Protocol）。

它与 Function Calling 有什么关系？

可以从两者解决的问题来理解。

### Function Calling：模型如何表达工具调用？

Function Calling 关注的是模型与工具调用请求之间的关系。

例如，模型需要表达：

> 我要调用 `read_file`，读取 `/src/main.py`。

外部程序获得这个请求后，再执行对应操作。

### MCP：AI 应用如何标准化连接外部工具？

MCP 则是一种用于 AI 应用与外部上下文服务之间通信的开放协议。

MCP 不只涉及工具，还定义了 Resources、Prompts 等能力。

例如，一个文件系统 MCP Server 可以向 AI 应用提供文件读取、目录查看等工具。

支持 MCP 的 Agent 可以通过 MCP Client 发现这些工具，并调用它们。

### 两者如何配合？

假设我们正在开发一个编程 Agent，希望它能够读取本地文件。

一种典型实现是：

```
用户：帮我读取 main.py
          │
          ▼
        Agent
          │
          ▼
     模型 Function Calling
          │
     read_file("main.py")
          │
          ▼
       Agent Harness
          │
          ▼
        MCP Client
          │
          ▼
     文件系统 MCP Server
          │
          ▼
       读取 main.py
          │
          ▼
    结果返回给 Agent
          │
          ▼
        模型回答
```

这里：

+ Function Calling 负责让模型表达工具调用意图。
+ MCP 负责标准化 AI 应用与外部工具服务之间的交互。
+ Agent Harness 负责连接这些组件，管理完整的执行流程。

因此，**MCP 并不是 Function Calling 的替代品，两者可以在同一个 Agent 系统中协同使用。**

此外，并非所有工具都必须通过 MCP 接入。Agent 也可以直接调用本地函数、HTTP API 或其他执行接口。

## 八、Function Calling 与 Agent Harness 有什么关系？

Function Calling 提供了模型使用工具的能力，但它本身并不等于一个完整的 Agent。

真正的 Agent 系统，还需要负责组织模型推理、执行工具、管理上下文和控制整个运行过程。

例如，用户提出：

> 帮我检查项目中的 TODO 注释，并整理成一份报告。

Agent 可能需要完成：

```
1. list_files
   查看项目文件结构
         │
         ▼
2. read_file
   读取相关代码文件
         │
         ▼
3. search_text
   查找 TODO 注释
         │
         ▼
4. write_file
   生成 TODO 报告
         │
         ▼
5. 返回最终结果
```

这里，模型可能需要连续进行多次 Function Calling。

但谁来负责维护这个循环？

答案通常是 **Agent Harness**。

它可以负责：

+ **Model Adapter**：适配不同厂商的模型 API。
+ **Tool Registry**：注册和管理可使用的工具。
+ **Tool Executor**：执行具体工具调用。
+ **Agent Loop**：组织多轮模型推理与工具执行。
+ **Context Management**：维护模型所需要的上下文。
+ **Error Handling**：处理超时、异常和失败重试。

一个简化的 Agent 循环可以这样表示：

```
while True:
    response = call_model(messages, tools)

    if not response.has_tool_calls:
        break

    for tool_call in response.tool_calls:
        result = execute_tool(tool_call)
        messages.append(result)
```

这只是概念性伪代码，并非可直接运行的完整 Agent 实现。

真实系统还需要保存模型的工具调用消息、关联调用 ID、校验参数、限制循环次数，并处理可能出现的并行调用。

### 为什么要设计统一的 Tool Abstraction？

假设我们的 Agent 同时支持 OpenAI、Anthropic 和 Gemini。

由于三家的 Function Calling 格式不完全一致，如果直接让执行层依赖厂商 API，代码会变得难以维护。

一种常见的工程设计是：

```
            OpenAI API
                 │
            Anthropic API
                 │
             Gemini API
                 │
                 ▼
           Provider Adapters
                 │
                 ▼
       Unified Tool Call Format
                 │
                 ▼
             Tool Executor
                 │
                 ▼
             External Tools
```

通过 Provider Adapter，将不同厂商的调用格式转换为统一的内部数据结构。

这样，模型层可以替换，而工具执行层不需要跟着改变。

当然，实际适配不只是修改字段名称，还可能涉及流式输出、消息上下文、调用 ID、并行调用和错误语义等差异。

## 九、实际开发中，还需要注意什么？

理解了 Function Calling 的机制，只是实现一个 Agent 的第一步。

在工程实践中，还需要重点考虑以下几个问题。

**1. 工具描述要清晰**

`description` 不仅应该说明工具能做什么，还应说明什么时候应该调用，以及什么情况下不应该调用。

例如，查询订单和查询商品库存应该具有明确的职责边界。

**2. 不能完全信任模型生成的参数**

即使参数符合 JSON Schema，也应该检查路径是否合法、用户是否具有权限，以及调用是否可能产生危险操作。

**3. 正确处理工具调用失败**

工具可能因为网络异常、超时、文件不存在等原因失败。

应用程序可以将适当的错误信息反馈给模型，让模型调整参数、选择其他方案或终止任务。

**4. 区分并行调用与顺序调用**

如果需要同时查询北京和上海的天气，两次调用没有依赖关系，可以并行执行。

但如果要先读取文件、再根据文件内容决定修改方案，就需要按依赖关系组织执行。

**5. 为 Agent Loop 设置执行边界**

实际系统应该限制最大工具调用次数、运行时间和资源消耗，避免模型陷入无意义的循环。

对于删除文件、执行高风险命令、发送消息等有实际影响的操作，还应该设置合理的权限和确认机制。

## 十、总结：如何理解 Function Calling？

回到文章最开始的问题：

> 大语言模型为什么能够读取文件、查询天气、执行命令？

关键并不是模型突然获得了直接操作计算机的能力，而是外部系统为模型提供了一条从“生成调用意图”到“执行实际操作”的路径。

Function Calling 就是其中的基础机制。

我们可以从三个层次理解整个系统：

**第一层：Function Calling**

模型如何选择工具，并生成结构化工具调用请求。

**第二层：MCP 等工具集成机制**

AI 应用如何连接外部工具和上下文服务。

**第三层：Agent Harness**

如何将模型、工具、上下文管理和执行控制组织成一个能够持续完成任务的 Agent 系统。

最后，记住一句话：

**Function Calling 让模型能够表达“我要做什么”；Agent 的执行环境负责真正“把事情做完”。**

理解了这一点，就掌握了 AI Agent 工具调用机制的基础，也为后续学习 Agent Loop、MCP 和 Agent Harness 建立了完整的概念框架。

## 十一、思考

理解了 Function Calling 的工作机制后，我认为还有几个值得进一步思考的问题。

### 1. Function Calling 让大模型从「回答问题」走向「执行任务」

传统 LLM 的主要能力是理解和生成内容，而 Function Calling 为模型与外部世界建立了一条交互通道。

这意味着，模型不再只能依赖已有知识回答问题，而是能够借助工具获取新信息，甚至对外部环境产生实际影响。

但需要注意，**Function Calling 只是提供了执行任务的基础能力，并不意味着模型天然具备复杂任务规划和自主执行能力。**

一个模型能够调用 `read_file`，与它能够独立完成一个大型软件项目，是两个不同层次的问题。

后者还需要任务规划、状态管理、错误恢复和持续迭代等能力。

### 2. 工具调用能力，不完全等于模型自身的能力

假设两个 Agent 使用完全相同的底层模型，但提供不同的工具集合。

Agent A 只能使用 `read_file` 和 `write_file`。

Agent B 除了文件操作，还能执行终端命令、搜索代码、运行测试，并获取程序执行反馈。

即使两个 Agent 使用相同的模型，它们最终能够完成的任务范围也可能有很大差异。

这说明一个重要问题：

**Agent 的实际能力，不仅取决于底层模型，也取决于工具系统及其执行环境。**

不过，工具数量并非越多越好。过多且职责重叠的工具，反而可能增加模型选择工具的难度。

真正重要的是工具设计是否合理，能否为模型提供清晰、可靠且必要的操作能力。

### 3. Function Calling 的格式统一，并不是 Agent 开发中最困难的问题

OpenAI、Anthropic、Gemini 的 Function Calling 格式虽然不同，但从工程角度来看，可以通过 Adapter 将它们转换成统一的内部数据结构。

相比之下，真正困难的往往是工具执行之后的事情。

例如：

+ 模型调用了错误的工具，该怎么办？
+ 工具执行失败，应该重试还是终止？
+ 多个工具之间存在依赖关系，如何协调执行？
+ 模型陷入无意义的工具调用循环，如何及时停止？
+ 工具能够修改文件或执行命令，如何保证操作安全？

这些问题已经超出了 Function Calling 本身的范围。

因此，**Function Calling 解决的是模型如何发起工具调用，而 Agent Harness 需要解决的是如何可靠地组织整个任务执行过程。**

这也是为什么仅仅实现几个工具调用接口，并不意味着已经构建了一个完善的 Agent 系统。

### 4. 从「模型中心」转向「模型与系统协同」

在学习大模型时，我们很容易将注意力集中在模型本身，例如参数规模、推理能力和 Benchmark 表现。

但在 Agent 场景中，还需要关注一个更完整的系统：

**模型负责理解与决策，工具负责执行，Harness 负责组织和控制整个过程。**

一个能力很强的模型，如果缺乏合适的工具和执行环境，很多能力就无法转化为实际任务成果。

反过来，一个设计良好的 Harness，也能通过清晰的工具接口、有效的上下文管理和可靠的执行反馈，更充分地发挥模型已有的能力。

当然，工程设计无法无限弥补模型能力的不足。两者应当被视为相互协作、相互制约的组成部分。

### 5. Function Calling 只是起点，真正值得研究的是整个 Agent Loop

如果说 Function Calling 让模型第一次有了使用外部工具的接口，那么 Agent Loop 则使这些工具调用能够被组织成一个持续执行的过程。

以编程 Agent 为例：

模型读取代码、发现问题、修改文件、运行测试、分析报错，再尝试修复。

其中任何一次工具调用都不算复杂，真正困难的是如何让整个循环稳定地朝着目标推进。

这也引出了值得继续研究的问题：

> 如何让模型在有限的上下文、工具权限和计算预算下，持续做出合理决策，并可靠地完成复杂任务？

我认为，这比单纯掌握 Function Calling 的 API 格式更值得关注。

**Function Calling 让模型具备了使用工具的能力，而如何将这种能力组织成稳定、可控、可验证的任务执行系统，才是 Agent 工程的核心挑战之一。**