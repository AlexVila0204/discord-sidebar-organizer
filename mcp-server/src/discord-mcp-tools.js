import { z } from 'zod';

export function registerDiscordTools(server, bridge) {
  server.registerTool(
    'get_discord_servers',
    {
      description: 'Retrieves all Discord servers (guilds) joined by the user, including server names, descriptions, and channel highlights for contextual categorization.'
    },
    async () => {
      try {
        const data = await bridge.getGuilds();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message
            }
          ]
        };
      }
    }
  );

  server.registerTool(
    'get_current_layout',
    {
      description: 'Gets the current Discord sidebar folders structure and server arrangement.'
    },
    async () => {
      try {
        const layout = await bridge.getCurrentLayout();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(layout, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message
            }
          ]
        };
      }
    }
  );

  const folderSchema = z.object({
    name: z.string().describe('Descriptive name with optional emoji for the folder'),
    color: z.number().int().optional().describe('Integer decimal color for the folder badge, e.g. 5793266'),
    guildIds: z.array(z.string()).optional().describe('List of Discord guild IDs belonging to this folder'),
    guild_ids: z.array(z.string()).optional().describe('Alternative list of Discord guild IDs belonging to this folder')
  });

  server.registerTool(
    'apply_discord_folders',
    {
      description: 'Applies a new folder organization to the user Discord sidebar in the browser.',
      inputSchema: {
        folders: z.array(folderSchema).describe('List of organized folders containing names and server guild IDs'),
        unorganizedGuildIds: z.array(z.string()).optional().describe('Optional list of guild IDs that should remain outside of any folder')
      }
    },
    async (params) => {
      try {
        const targetFolders = params?.folders || [];
        if (!Array.isArray(targetFolders) || targetFolders.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Error: Cannot apply an empty folders list. Please specify at least one folder category with server IDs.'
              }
            ]
          };
        }

        const normalizedFolders = targetFolders.map((f) => ({
          name: f.name || 'Folder',
          color: f.color || 5793266,
          guildIds: f.guildIds || f.guild_ids || []
        }));

        const result = await bridge.applyFolders({
          folders: normalizedFolders,
          unorganizedGuildIds: params.unorganizedGuildIds || []
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message
            }
          ]
        };
      }
    }
  );

  server.registerTool(
    'restore_previous_layout',
    {
      description: 'Restores the previously backed up folder layout on Discord.'
    },
    async () => {
      try {
        const result = await bridge.restorePreviousLayout();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message
            }
          ]
        };
      }
    }
  );

  server.registerTool(
    'restore_original_layout',
    {
      description: 'Restores the initial original folder layout recorded before any AI modifications.'
    },
    async () => {
      try {
        const result = await bridge.restoreOriginalLayout();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message
            }
          ]
        };
      }
    }
  );
}
