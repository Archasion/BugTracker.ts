import Command from "../../modules/interactions/commands/Command";
import PermissionUtils from "../../utils/PermissionUtils";
import Guilds from "../../db/models/Guilds";
import Bot from "../../Bot";

import { 
      ApplicationCommandChoicesData, 
      ApplicationCommandOptionType, 
      ChatInputCommandInteraction, 
      ApplicationCommandType, 
      PermissionResolvable, 
      PermissionFlagsBits,
      ChannelType, 
      NewsChannel, 
      TextChannel
} from "discord.js";

import { RestrictionLevel } from "../../utils/RestrictionUtils";

const channelType: ApplicationCommandChoicesData = {
      name: "type",
      description: "The type of channel to perform the action on",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
            {
                  name: "Suggestion Submissions",
                  value: "suggestions"
            },
            {
                  name: "Bug Report Submissions",
                  value: "bugs"
            },
            {
                  name: "Player Report Submissions",
                  value: "reports"
            },
            {
                  name: "Report/Suggestion Archive",
                  value: "archive"
            },
            {
                  name: "Bot Update Announcements",
                  value: "bot_updates"
            }
      ]
};

const permissions: { [key: string]: PermissionResolvable[] } = {
      setChannel: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
      ],
      setReportChannel: [
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.ManageThreads,
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.UseExternalEmojis
      ]
};

export default class ChannelCommand extends Command {
	constructor(client: Bot) {
		super(client, {
			name: "channel",
			description: "Manage the channels configured for the bot.",
			restriction: RestrictionLevel.Administrator,
                  type: ApplicationCommandType.ChatInput,
			options: [
                        {
                              name: "set",
					description: "Sets the channel for the bot perform certain tasks in.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [
                                    channelType,
                                    {
                                          name: "channel",
                                          description: "The channel to set for the chosen task(s).",
                                          type: ApplicationCommandOptionType.Channel,
                                          required: true
                                    }
                              ]
				},
                        {
                              name: "view",
					description: "View the configured channel for certain tasks.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [channelType]
				},
                        {
                              name: "reset",
					description: "Remove a channel configuration (will prevent certain tasks from being performed)",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [channelType]
				}
			]
		});
	}

	/**
	 * @param {Interaction} interaction
	 * @returns {Promise<void|any>}
	 */
      async execute(interaction: ChatInputCommandInteraction): Promise<void> {    
            const action = interaction.options.getSubcommand();
		const type = interaction.options.getString("type") as string;

            switch (action) {
                  case "set": {
                        const channel = interaction.options.getChannel("channel");

                        if (
                              channel?.type !== ChannelType.GuildText &&
                              channel?.type !== ChannelType.GuildNews
                        ) {
                              interaction.editReply("You must select either a text or a news channel.");
                              return;
                        }

                        let hasPerms: boolean;

                        if (type === "suggestions") {
                              hasPerms = await PermissionUtils.botHasPermissions(interaction, permissions.setChannel, channel as TextChannel | NewsChannel);
                        } else {
                              hasPerms = await PermissionUtils.botHasPermissions(interaction, [...permissions.setChannel, ...permissions.setReportChannel], channel as TextChannel | NewsChannel);
                        }

                        if (!hasPerms) return;

                        await Guilds.updateOne({ id: interaction.guildId }, { $set: { [`channels.${type}`]: channel?.id } });
                        interaction.editReply(`The **${type}** channel has been set to ${channel}.`);
                        break;
                  }

                  case "reset": {
                        await Guilds.updateOne({ id: interaction.guildId }, { $set: { [`channels.${type}`]: null } });
                        interaction.editReply(`The **${type}** channel has been reset.`);
                        break;
                  }

                  case "view": {
                        const guildConfig = await Guilds.findOne(
                              { id: interaction.guildId }, 
                              { channels: 1, _id: 0 }
                        );

                        const channelId = guildConfig?.channels[type];

                        if (!channelId) {
                              interaction.editReply("There is no channel set for this type.\nYou can set one using `/channel set`");
                              return;
                        }

                        interaction.editReply(`The **${type.replace(/_/g, " ")}** channel is set to <#${channelId}>.`);
                        break;
                  }
            }

            return;
	}
}