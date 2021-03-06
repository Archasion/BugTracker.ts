import Command from "../../modules/interactions/commands/Command";
import Guilds from "../../db/models/Guilds";
import Bot from "../../Bot";

import { 
      ApplicationCommandChoicesData, 
      ApplicationCommandOptionType, 
      ChatInputCommandInteraction, 
      ApplicationCommandType, 
      EmbedBuilder, 
      Role 
} from "discord.js";

import { RestrictionLevel } from "../../utils/RestrictionUtils";

const roleType: ApplicationCommandChoicesData = {
      name: "type",
      description: "The rank to configure the role for.",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
            {
                  name: "Reviewer",
                  value: "reviewer"
            },
            {
                  name: "Moderator",
                  value: "moderator"
            },
            {
                  name: "Administrator",
                  value: "administrator"
            }
      ]
};

export default class RoleCommand extends Command {
	constructor(client: Bot) {
		super(client, {
			name: "role",
			description: "Manage the roles configured for the bot.",
			restriction: RestrictionLevel.Administrator,
                  type: ApplicationCommandType.ChatInput,
			options: [
                        {
                              name: "set",
					description: "Allow a role to perform certain tasks.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [
                                    roleType,
                                    {
                                          name: "role",
                                          description: "The role to set for the rank.",
                                          type: ApplicationCommandOptionType.Role,
                                          required: true
                                    }
                              ]
				},
                        {
                              name: "view",
					description: "View the configured role for certain ranks.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [roleType]
				},
                        {
                              name: "reset",
					description: "Remove a role configuration.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [roleType]
				},
                        {
                              name: "info",
					description: "Get information on the chosen role.",
                              type: ApplicationCommandOptionType.Subcommand,
                              options: [
                                    {
                                          name: "role",
                                          description: "The role to view information on.",
                                          type: ApplicationCommandOptionType.Role,
                                          required: true
                                    }
                              ]
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
            const role = interaction.options.getRole("role") as Role;

            switch (action) {
                  case "set": {
                        await Guilds.updateOne({ id: interaction.guildId }, { $set: { [`roles.${type}`]: role?.id } });
                        interaction.editReply(`The **${type}** role has been set to ${role}.`);
                        break;
                  }

                  case "reset": {
                        await Guilds.updateOne({ id: interaction.guildId }, { $set: { [`roles.${type}`]: null } });
                        interaction.editReply(`The **${type}** role has been reset.`);
                        break;
                  }

                  case "view": {
                        const guildConfig = await Guilds.findOne(
                              { id: interaction.guildId }, 
                              { roles: 1, _id: 0 }
                        );

                        const roleId = guildConfig?.roles[type];

                        if (!roleId) {
                              interaction.editReply("There is no role set for this rank.\nYou can set one using `/role set`");
                              return;
                        }

                        interaction.editReply(`The **${type.replace(/_/g, " ")}** role is set to <@&${roleId}>.`);
                        break;
                  }

                  case "info": {
                        const embed = new EmbedBuilder()
                              .setColor(role?.color)
                              .setTitle(role?.name)
                              .setThumbnail((role as Role).iconURL())
                              .setFooter({ text: `ID: ${role?.id}` })
                              .setFields([
                                    {
                                          name: "Created",
                                          value: `<t:${Math.round(role.createdTimestamp as number / 1000)}:R>`,
                                          inline: true
                                    },
                                    {
                                          name: "Color",
                                          value: role.hexColor,
                                          inline: true
                                    },
                                    {
                                          name: "Members",
                                          value: role.members.size.toString(),
                                          inline: true
                                    },
                                    {
                                          name: "Position",
                                          value: role.position.toString(),
                                          inline: true
                                    },
                                    {
                                          name: "Mentionable",
                                          value: role.mentionable.toString(),
                                          inline: true
                                    },
                                    {
                                          name: "Hoisted",
                                          value: role.hoist.toString(),
                                          inline: true
                                    },
                                    {
                                          name: `Permissions (${role.permissions.toArray().length})`,
                                          value: `\`${role.permissions.toArray().join("` `") || "None"}\``,
                                          inline: false
                                    }
                              ]);

                              interaction.editReply({ embeds: [embed] });
                        break;
                  }
            }

            return;
	}
}