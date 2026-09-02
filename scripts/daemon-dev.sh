#!/usr/bin/env python3
"""Double-fork daemon launcher for the dev server.

The sandbox reaps processes still attached to the command's process tree
when a Bash tool call ends. A double-fork daemon (ppid -> 1) survives,
exactly like the agent-browser daemon does.
"""
import os
import sys

LOG = '/home/z/my-project/dev.log'
CWD = '/home/z/my-project'

# Already daemonized? exec directly.
if os.fork() > 0:
    # First parent: exit immediately so the shell returns.
    sys.exit(0)

os.setsid()

if os.fork() > 0:
    # Intermediate parent: exit so the final child is reparented to init.
    sys.exit(0)

# Daemon context: ppid == 1, new session, no controlling terminal.
os.chdir(CWD)
os.umask(0)

# Redirect stdio to the dev log (append).
fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(fd, 1)
os.dup2(fd, 2)
os.close(fd)
# stdin from /dev/null
fdn = os.open(os.devnull, os.O_RDONLY)
os.dup2(fdn, 0)
os.close(fdn)

os.execvp('bun', ['bun', 'run', 'dev'])
