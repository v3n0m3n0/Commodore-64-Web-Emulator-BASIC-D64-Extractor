# VICE Monitor & Remote Debugger Protocol Specification

> **Source Reference**: Official VICE Documentation (*Versatile Commodore Emulator*) — `https://vice-emu.sourceforge.io/vice_toc.html`  
> **Interfaces**: Built-in Text Monitor, CLI Batch Scripts (`-moncommands`), Binary Remote Debugger Protocol (`-binarymonitor`)

---

## 1. Built-in Interactive Monitor Command Set

The VICE built-in monitor allows full cycle-accurate inspection and live modification of the virtual machine.

### 1.1. Execution Control
- `g [address]` (`goto`): Resume execution at the current Program Counter or specified address.
- `z` (`step`): Single-step one machine instruction (steps into subroutine calls).
- `n` (`next`): Step over subroutine calls (`JSR`), executing subroutines at full speed and stopping at the following opcode.
- `return`: Continue execution until the current subroutine returns (`RTS` or `RTI`).

### 1.2. Checkpoints (Breakpoints, Watchpoints & Tracepoints)
- `break [address] [if condition]`: Set an execution breakpoint at `address`.
- `watch [address] [load|store] [if condition]`: Set a memory read/write watchpoint.
- `trace [address]`: Log instruction execution at `address` without pausing the CPU.
- `checkpoints`: List all active breakpoints and watchpoints with their IDs.
- `delete <checkpoint_id>`: Remove a specific breakpoint.
- `enable <checkpoint_id>` / `disable <checkpoint_id>`: Toggle breakpoint state.
- `condition <checkpoint_id> if <expr>`: Attach a conditional expression (e.g., `A == $00 && X > $10`).

### 1.3. Memory Inspection, Modification & Disassembly
- `m [start] [end]`: Display hexadecimal memory dump.
- `d [start] [end]`: Disassemble machine code into 6510 assembly mnemonics.
- `> [address] [byte1] [byte2]...`: Write byte sequence directly to memory starting at `address`.
- `f [start] [end] [byte]`: Fill memory range `[start]..[end]` with constant byte.
- `t [source_start] [source_end] [dest]`: Transfer/copy memory block.
- `c [start1] [end1] [start2]`: Compare memory blocks and report differences.
- `bank [bank_name]`: Switch active memory bank context (`cpu`, `ram`, `rom`, `io`, `cart`, `1541`).
- `radix [hex|dec|oct|bin]`: Change the default numerical display base.

### 1.4. CPU Registers & History
- `r` (`registers`): Display all 6510 CPU registers (`PC`, `A`, `X`, `Y`, `SP`, Status Flags `NV-BDIZC`).
- `r <reg> = <value>`: Assign new value to a specific register (e.g., `r A = $FF`).
- `cpuhistory [count]`: Display a trace of the last `count` executed instructions with register states.

---

## 2. Binary Remote Monitor Protocol Specification

The Binary Remote Monitor allows external IDEs, debuggers (VS Code extensions, C64Studio), and CI/CD tools to control VICE over a TCP/IP socket connection (`default port: 6510`).

### 2.1. Frame Structure & Handshake
All binary packets start with an ASCII `STX` (`$02`) byte, use **Little-Endian** multi-byte integers, and have the following layout:

```
+-------------+--------+---------------------------------------------------------------+
| Byte Offset | Size   | Field Description                                             |
+-------------+--------+---------------------------------------------------------------+
| $00         | 1 B    | ASCII STX Synchronization Marker ($02)                        |
| $01         | 1 B    | Protocol API Version ($02)                                    |
| $02 - $05   | 4 B    | Body Length: 32-bit uint LE (Total length of remainder)       |
| $06 - $09   | 4 B    | Request ID: 32-bit uint LE (Matched in response frame)        |
| $0A         | 1 B    | Command Opcode / Response Type                                |
| $0B - end   | N B    | Command Parameters / Payload Data                             |
+-------------+--------+---------------------------------------------------------------+
```

### 2.2. Command Opcode Reference Table

```
+--------+--------------------------+--------------------------------------------------+
| Opcode | Command Name             | Description / Primary Payload Parameters         |
+--------+--------------------------+--------------------------------------------------+
| $01    | `MON_CMD_MEM_GET`        | Read memory buffer: (sidefx, start, end, memspace|
| $02    | `MON_CMD_MEM_SET`        | Write memory buffer: (sidefx, start, memspace...)|
| $11    | `MON_CMD_CHECKPOINT_GET` | Query specific checkpoint details by ID          |
| $12    | `MON_CMD_CHECKPOINT_SET` | Create new breakpoint / watchpoint               |
| $13    | `MON_CMD_CHECKPOINT_DEL` | Delete checkpoint by ID                          |
| $14    | `MON_CMD_CHECKPOINT_LIST`| List all registered checkpoints                  |
| $15    | `MON_CMD_CHECKPOINT_TOG` | Enable / Disable checkpoint                      |
| $22    | `MON_CMD_CONDITION_SET`  | Set conditional expression for breakpoint        |
| $31    | `MON_CMD_REGISTERS_GET`  | Retrieve CPU register array for specified device |
| $32    | `MON_CMD_REGISTERS_SET`  | Update CPU registers                             |
| $41    | `MON_CMD_DUMP`           | Create a memory / system state dump              |
| $42    | `MON_CMD_UNDUMP`         | Restore system state from dump                   |
| $51    | `MON_CMD_RESOURCE_GET`   | Query internal VICE configuration resource string|
| $52    | `MON_CMD_RESOURCE_SET`   | Change internal VICE configuration resource      |
| $71    | `MON_CMD_ADVANCE_INST`   | Advance execution by N instructions (Step)       |
| $72    | `MON_CMD_KEYBOARD_FEED`  | Inject PETSCII string into keyboard buffer       |
| $73    | `MON_CMD_EXEC_UNTIL_RET` | Execute until current function returns           |
| $81    | `MON_CMD_PING`           | Keep-alive ping (Returns Pong response)          |
| $82    | `MON_CMD_BANKS_AVAIL`    | Enumerate available memory bank identifiers      |
| $83    | `MON_CMD_REGISTERS_AVAIL`| Enumerate register IDs and sizes                 |
| $AA    | `MON_CMD_EXIT`           | Terminate emulator process                       |
| $BB    | `MON_CMD_QUIT`           | Disconnect binary monitor session                |
| $CC    | `MON_CMD_RESET`          | Trigger Soft (0) or Hard (1) Machine Reset       |
| $DD    | `MON_CMD_AUTOSTART`      | Trigger image autostart (disk/tape/cartridge)    |
+--------+--------------------------+--------------------------------------------------+
```

### 2.3. Asynchronous Events & Notifications
When the emulator is running, the binary monitor connection streams asynchronous push events back to the client:
- **`MON_RESPONSE_STOPPED` (`$61`)**: Emitted whenever the CPU hits a breakpoint, watchpoint, or `BRK` instruction, containing the current `PC` and cause of halt.
- **`MON_RESPONSE_RESUMED` (`$62`)**: Emitted when emulation resumes execution.
