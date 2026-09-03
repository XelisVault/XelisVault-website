#!/usr/bin/env python3
import os, sys
LOG = '/home/z/my-project/dev.log'
CWD = '/home/z/my-project'
if os.fork() > 0: sys.exit(0)
os.setsid()
if os.fork() > 0: sys.exit(0)
os.chdir(CWD); os.umask(0)
fd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(fd, 1); os.dup2(fd, 2); os.close(fd)
fdn = os.open(os.devnull, os.O_RDONLY); os.dup2(fdn, 0); os.close(fdn)
os.execvp('bun', ['bun', 'run', 'dev'])
