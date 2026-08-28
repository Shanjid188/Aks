/**
 * PM2 process definition for the AKS VPS deployment.
 *
 *   pm2 start ecosystem.config.cjs     # start (from repo root)
 *   pm2 logs aks-store                 # tail logs
 *   pm2 restart aks-store              # after git pull + rebuild
 *   pm2 save && pm2 startup            # auto-start on reboot
 *
 * cwd is ./server so the app resolves ../dist (storefront), ../admin/dist and
 * ../public exactly like it does in local development.
 */
module.exports = {
  apps: [
    {
      name: 'aks-store',
      cwd: __dirname + '/server',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      time: true,
    },
  ],
};