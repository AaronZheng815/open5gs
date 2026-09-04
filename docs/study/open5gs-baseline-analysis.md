# Open5GS 基线分析

> 本文是 `open5gs` 仓库上线前的**基线快照**,用于回答"这套东西有哪些能力、由哪些网元组成、当前怎么部署、数据怎么存"。基线建立后,任何特性改动都应能对照此表识别影响面。
>
> - 版本:`2.8.0`(meson.build)
> - License:AGPL-3.0-or-later(商业授权见 NewPlane)
> - 上游:https://open5gs.org
> - 采集时间:2026-09-04,守护进程与配置取自本机实测

---

## 1. 项目定位

Open5GS 是一个开源的 **5G Core(5GC)+ 4G EPC(双模)** 实现,遵循 3GPP 约定的控制面/用户面分组:

- **5G**:3GPP 服务化架构(Service-Based Architecture, SBA),网元间走 HTTP/2 的 SBI(Service-Based Interface),缺省端口 7777。
- **4G**:演进分组核心(EPC),S1AP/S6a/S11/S5/S8/Gx 等传统接口。

同一份构建、同一套配置,可只跑 5G、只跑 4G,或双模并存。本机即双模(16 个守护进程)。

> ⚠ 注意:docker-compose.yml 中注释掉的 `open5gs-pgwd/-sgwd/-hssd/-mmed` 是**旧版组合网元**名称;2.8.0 已拆分为 `sgwc`/`sgwu`/`smf`/`mme`/`hss`/`pcrf` 等独立守护进程,勿被注释误导。

---

## 2. 架构总览

```mermaid
flowchart TB
    subgraph UE_5G[UE (5G)]
        N1
    end
    subgraph UE_4G[UE (4G)]
        L1[LTE Uu]
    end
    subgraph RAN[接入网]
        GN[gNB]
        EN[eNodeB]
    end
    subgraph 5GC[5G Core - SBA]
        AMF; SMF; UPF; AUSF; UDM; UDR; PCF; NSSF; BSF; NRF; SCP
    end
    subgraph EPC[4G EPC]
        MME; HSS; SGWC; SGWU; PCRF
    end
    subgraph DATA[数据层]
        MONGO[(MongoDB<br/>open5gs.subscribers)]
    end

    UE_5G ---|NR| GN ---|N2/NGAP| AMF
    GN ---|N3/GTP-U| UPF
    AMF -. SBI .- SMF ---|N4/PFCP| UPF
    AMF -.-> NRF; SMF -.-> NRF
    AUSF -.-> UDM; UDM -.-> UDR
    PCF -.-> UDR; PCF -.-> NSSF; PCF -.-> BSF
    SCP -.-> AMF; SCP -.-> NRF

    UE_4G ---|LTE| EN ---|S1AP| MME
    MME ---|S11| SGWC ---|S5/S8| SGWU
    MME ---|S6a| HSS
    PCRF ---|Gx| SMF
    SGWC ---|Sx/PFCP| SGWU

    HSS -. db .-> MONGO
    UDR -. db .-> MONGO
    PCF -. db .-> MONGO
    PCRF -. db .-> MONGO
```

- **SBI 网元**(NRF/SCP/AMF/SMF/AUSF/UDM/UDR/PCF/NSSF/BSF):控制面,HTTP/2,走 NRF 注册、SCP 可选间接通信。
- **5G 用户面**:UPF 承担 N3(GTP-U, 2152)+ N4(PFCP, 8805)。
- **4G 控制面**:MME(S1AP/S11/S6a)、HSS(S6a)、SGW-C(S11/S5/S8)、PCRF(Gx)。
- **4G 用户面**:SGW-U(S5/S8 GTP-U)。

---

## 3. 网元清单与接口

> 地址、运行状态取自本机实测(`/usr/local/etc/open5gs/*.yaml` + `ps`)。SBI 端口 7777,NGAP/S1AP 端口 36412(SCTP),PFCP 8805,GTP-U 2152,Diameter(S6a/Gx) 3868 — 此处按 3GPP 缺省标注。

### 3.1 5G Core(SBA)

| 网元 | 3GPP 角色 | 主要接口 | 协议/端口 | 本测试床地址 | 运行 |
| --- | --- | --- | --- | --- | --- |
| **NRF** | 网元注册与发现 (Discovery & Registration) | SBI | HTTP/2, 7777 | `127.0.0.10` | ✅ |
| **SCP** | 服务通信代理 (间接通信) | SBI | HTTP/2, 7777 | `127.0.0.200` | ✅ |
| **AMF** | 接入与移动性管理 | N1/N2(NGAP)、SBI、Metrics | SCTP 36412, HTTP/2 7777, 9090 | N2 `172.18.10.2`;SBI `127.0.0.5` | ✅ |
| **SMF** | 会话管理 (PDU Session) | N4(PFCP)、SBI、N7(PCF) | HTTP/2 7777, PFCP 8805 | SBI `127.0.0.4`;PFCP `127.0.0.4` | ✅ |
| **UPF** | 用户面功能 (User Plane) | N3(GTP-U)、N4(PFCP) | GTP-U 2152, PFCP 8805 | N3 `172.18.10.2`;PFCP `127.0.0.7` | ✅ |
| **AUSF** | 鉴权服务器功能 | N12/AUSF (SBI) | HTTP/2, 7777 | `127.0.0.11` | ✅ |
| **UDM** | 统一数据管理 | N8/N10/N13 (SBI) | HTTP/2, 7777 | `127.0.0.12` | ✅ |
| **UDR** | 统一数据仓库 | NUDM/NUDR (SBI) | HTTP/2, 7777;MongoDB | `127.0.0.20`;db `mongodb://localhost/open5gs` | ✅ |
| **PCF** | 策略控制功能 | N5/N7 (SBI) | HTTP/2, 7777;MongoDB | `127.0.0.13`;db `mongodb://localhost/open5gs` | ✅ |
| **NSSF** | 网络切片选择 | N22/NNSSF (SBI) | HTTP/2, 7777 | `127.0.0.14` | ✅ |
| **BSF** | 绑定支持功能 (BD/Binding) | NBSF (SBI) | HTTP/2, 7777 | `127.0.0.15` | ✅ |

### 3.2 4G EPC

| 网元 | 3GPP 角色 | 主要接口 | 协议/端口 | 本测试床地址 | 运行 |
| --- | --- | --- | --- | --- | --- |
| **MME** | 移动性管理实体 | S1AP、S11、S6a、S10 | SCTP 36412, GTP-C/Diameter 3868 | S1AP `172.18.10.2`;S11/S6a `127.0.0.2` | ✅ |
| **HSS** | 归属用户服务器 | S6a | Diameter 3868;MongoDB | `127.0.0.8`;db `mongodb://localhost/open5gs` | ✅ |
| **SGW-C** | 服务网关(控制面) | S11、S5/S8、Sx | GTP-C、PFCP 8805 | `127.0.0.3` | ✅ |
| **SGW-U** | 服务网关(用户面) | S5/S8(GTP-U)、Sx | GTP-U 2152, PFCP 8805 | `127.0.0.6` | ✅ |
| **PCRF** | 策略与计费规则功能 | Gx | Diameter 3868;MongoDB | `127.0.0.9`;db `mongodb://localhost/open5gs` | ✅ |

### 3.3 漫游网元(仅配置,未启用)

| 网元 | 角色 | 本测试床地址 | 运行 |
| --- | --- | --- | --- |
| **SEPP** | 安全边缘保护代理 (Inter-PLMN 漫游) | sepp1 `127.0.1.250`;sepp2 `127.0.2.250` | ❌ 未启动 |

> `src/sepp/` 与 `sepp1.yaml`/`sepp2.yaml` 均在,但当前拓扑没有运行 SEPP 守护进程(漫游场景才需一对)。

---

## 4. 部署拓扑(本机测试床)

- **PLMN**:mcc `460` / mnc `11`(即 460-11)
- **TAC**:1;AMF GUAMI region `2` / set `1`;MME `mme_gid=2`、`mme_code=1`
- **切片**:`sst=1`(default)
- **5G UE**:UPF 会话地址池 `10.45.0.0/16`(gw `10.45.0.1`)+ IPv6 `2001:db8:cafe::/48`
- **待注册 IMSI**:`460111234560001`(k/opc/amf 已在 subscriber 中预置)

### 4.1 地址映射表(实测配置)

全部网元绑定在**不同回环地址**上,互不冲突;只有触碰 eNB/gNB 的 **S1AP/N2(MME/AMF)** 与 **N3(GTP-U, UPF)** 用外部地址 `172.18.10.2`。

| 地址 | 网元 | 用途 |
| --- | --- | --- |
| `127.0.0.2` | MME | S11/S6a(内部控制面) |
| `172.18.10.2` | MME / AMF / UPF | S1AP / NGAP(N2)/ GTP-U(N3) — 对 eNB/gNB 外部面 |
| `127.0.0.3` | SGW-C | S11/S5/S8 |
| `127.0.0.4` | SMF | SBI / N4(PFCP) |
| `127.0.0.5` | AMF | SBI / Metrics(9090) |
| `127.0.0.6` | SGW-U | S5/S8、Sx(PFCP) |
| `127.0.0.7` | UPF | PFCP(N4) |
| `127.0.0.8` | HSS | S6a |
| `127.0.0.9` | PCRF | Gx |
| `127.0.0.10` | NRF | SBI |
| `127.0.0.11` | AUSF | SBI |
| `127.0.0.12` | UDM | SBI |
| `127.0.0.13` | PCF | SBI |
| `127.0.0.14` | NSSF | SBI |
| `127.0.0.15` | BSF | SBI |
| `127.0.0.20` | UDR | SBI |
| `127.0.0.200` | SCP | SBI |
| `127.0.1.250/251/252` | SEPP1 | (未启用) |
| `127.0.2.250/251/252` | SEPP2 | (未启用) |

> AMF 的 SBI client 指向 **SCP(`127.0.0.200:7777`)** 而非直连 NRF,即 SCP 间接通信模式。

### 4.2 当前运行状态(2026-09-04)

`ps` 实测量:5G 11 个 + 4G 5 个 = **16 个守护进程**,无 SEPP。每个网元独立进程(无组合网元)。

---

## 5. 构建与运行

- **构建系统**:Meson(>=0.43.0)+ Ninja;源码语言 C(`gnu89`)/ C++(部分 ASN.1 生成)。
- **依赖(meson-ci.yml)**:`libsctp-dev libgnutls28-dev libgcrypt-dev libssl-dev libidn11-dev libmongoc-dev libbson-dev libyaml-dev libnghttp2-dev libmicrohttpd-dev libcurl4-gnutls-dev libtins-dev libtalloc-dev libc-ares-dev`,及 `flex bison ninja-build`。
- **运行时**:需要 MongoDB(`mongodb://localhost/open5gs`)+ 用户态 GTP-U TUN(`ogstun`);循环/环回地址绑定用 `ip addr add` 预置。
- **顶层库(lib/)**:`app core crypt dbi gtp ipfw metrics nas ngap pfcp proto s1ap sbi sctp tun` 及 `asn1c`/`third-party`。各网元通过 `src/<nf>/` 内的 meson 生成 `open5gs-<nf>d` 二进制。

### 5.1 关键目录

| 路径 | 内容 |
| --- | --- |
| `src/<nf>/` | 各网元源码(amf/ausf/bsf/hss/mme/nrf/nssf/pcf/pcrf/scp/sepp/sgwc/sgwu/smf/udm/udr/upf) |
| `lib/` | 通用库(SBI、S1AP/NGAP、PFCP、GTP、Diameter、NAS、Crypt 等) |
| `configs/open5gs/*.yaml.in` | 各网元**模板配置**(`..in` 由 meson 生成到 `/usr/local/etc/open5gs/`) |
| `configs/*.yaml.in` | 组合场景模板(attach/transfer/volte/vonr/slice/csfb/non3gpp 等) |
| `tests/` | 功能测试(stub eNB/gNB、attach、registration、handover、csfb、slice、transfer 等) |
| `webui/` | Web UI(React),写入 MongoDB subscriber |
| `docker/` | 容器编排与打包 |
| `misc/`、`debian/`、`vagrant/` | 打包与部署辅助 |

---

## 6. 数据模型(MongoDB)

HSS(4G)与 UDM/UDR(5G)访问**同一个** `open5gs` 数据库的 `subscribers` 集合 — 即 **4G 与 5G 共用一份签约数据**,不单独开户。

- **每 IMSI 一条记录**,字段含:
  - `imsi`、`k`、`opc`、`amf`、`sqn`(鉴权根数据)
  - 5G:`slice[].session[]`(`sst`/`sd`/`dnn`/`type`/`ambr` 等)
  - 4G:顶层 `ambr`(用于 EPC subscription/承载),SDNN/APN 与计费规则供 PCRF(SMF Gx)
- 当前预置:IMSI `460111234560001`。

> 其余集合(`policies`、`sessions` 等)由 PCF/UDM/SMF 运行时写入,非基线重点。

---

## 7. 测试 / CI / 门禁

| 类别 | 手段 | 说明 |
| --- | --- | --- |
| 构建+单元测试 | `github/workflows/meson-ci.yml`(`meson setup build` → `meson test`) | Ubuntu CI,`ubunttu-latest` |
| 系统测试 | `tests/`(`attach`/`registration`/`handover`/`csfb`/`slice`/`transfer`) | 需 stub 接入网 + TUN |
| 模糊测试 | `github/workflows/cifuzz.yml` | CIFuzz/OSS-Fuzz |
| Harness 消费门禁 | `github/workflows/harness-gate.yml` | 校验 `.harness` submodule pin v0.3.1 + SDD + ignore ⚠(见下) |
| SDD 资产校验 | `.harness/scripts/consumer-quality-gate.sh` | 本地:`[CONSUMER][summary][PASS] errors=0` |

> ⚠ **harness-gate.yml 部署限制**:`.harness` submodule 托管在内部 GitLab `http://10.18.1.2:9999/...`。GitHub 云 runner(`ubuntu-latest`)**无法访问**该内网地址,门禁将在 submodule 初始化处失败。需**自建内网 runner**(能同时触达 GitHub 与内网 GitLab)或把 harness 镜像到公开地址后改写 `.gitmodules`。

---

## 8. 关键标识 / 便于对照的常量

| 项 | 值 |
| --- | --- |
| 版本 | 2.8.0 |
| PLMN | 460-11 |
| TAC | 1 |
| AMF GUAMI | region 2 / set 1 |
| MME GID / Code | 2 / 1 |
| S-NSSAI | sst=1 |
| UE 地址池 | 10.45.0.0/16,2001:db8:cafe::/48 |
| 待注册 IMSI | 460111234560001 |
| 服务化端口 | 7777(HTTP/2) |
| S1AP/NGAP | 36412(SCTP) |
| PFCP | 8805 |
| GTP-U | 2152 |
| Diameter(S6a/Gx) | 3868 |
| 数据库 | mongodb://localhost/open5gs |

---

## 9. 基线结论

1. **能力覆盖**:同时交出 5G Core(SBA)与 4G EPC,双模运行,16 个守护进程在线;漫游(SEPP)节点仅配置未启用。
2. **数据契约**:4G/5G 共用一锅 subscriber(HSS 与 UDM/UDR/PCF/PCRF 均指 `mongodb://localhost/open5gs`),无需分别开户。
3. **地址规划**:控制面全部走独立回环地址,对外只暴露 `172.18.10.2`(S1AP/N2/N3),结构清晰、互不冲突。
4. **工程化**:Meson 多库拆分 + `src/<nf>` 分网元 + 功能测试 + CI,接入了团队 Harness(SDD+门禁)。
5. **已知约束**:harness 消费门禁依赖内网 runner;`webui/.env` 为未追踪密钥(提交时务必定向 `git add`)。

> 后续任何改动(新增网元、改接口、调地址、变数据模型)请回到**第 3 节接口表**与**第 4 节地址表**对照影响面,并按团队 SDD(Specify → Requirement Analysis → Plan → Tasks → Implement)记录。
