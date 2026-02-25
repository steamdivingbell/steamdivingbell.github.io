"""
This python script commits and pushes the changes afer the main script (scraper.py) runs.
It used to be an inline bash script until it got too complicated.
"""
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from scraper import load_json

def git(*args):
  return subprocess.check_output(['git', *args])


num_files = subprocess.run(['git', 'diff', '--quiet', '--exit-code']).returncode
print('Detected changed files')
if num_files == 0:
  exit() # If no unstaged files, exit the script

# Check that all files are still valid JSON, excluding the app files (since that takes too long to validate)
for file in Path('.').glob('*.js*'):
  try:
    load_json(file) # Will throw on failure
  except:
    print('Failed to parse file', file)
    raise

print('All files validated')

git('config', '--global', 'user.email', 'steam-diving-bell@noreply.github.com')
git('config', '--global', 'user.name', 'SteamDivingBellBot')
git('add', '-A')
git('commit', '-am', f'Updated game data on {datetime.now(timezone.utc)}')

try:
  git('push')
except subprocess.CalledProcessError as e:
  print(e)
  git('fetch', 'origin', 'master')
  git('rebase', 'origin/master', '-Xtheirs') # Merge with master but our changes lose (we're just a stupid bot)
  git('log', '--oneline', '-n', '10')
  try:
    git('push')
  except subprocess.CalledProcessError as e2:
    print(e2)
    exit(1)
