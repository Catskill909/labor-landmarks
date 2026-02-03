#!/bin/bash
echo "Downloading backup directly from server..."
curl -v -OJ http://localhost:3001/api/admin/backup
echo ""
echo "Backup downloaded to current directory!"
ls -lh landmarks_backup_*.json
