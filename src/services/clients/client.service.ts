import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as fs from 'fs';
import { Client, Role } from '@prisma/client';
import { EncryptService } from 'src/encrypt/encrypt.service';


@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService,
  private readonly encryptService: EncryptService, // Inject EncryptService

  ) {}
  async createClient(body: any, photo: Express.Multer.File) {
    const { nom, prenom, telephone, adresse, categorieId, max_montant, login, password, role } = body;

    // Validate required fields for client
    if (!nom || !prenom || !telephone) {
        throw new InternalServerErrorException('Champs obligatoires manquants');
    }

    let photoUrl: string | null = null;

    // Handle photo upload to Cloudinary using the buffer
    if (photo) {
        try {
            const uploadResponse = await new Promise((resolve, reject) => {
                const upload = cloudinary.uploader.upload_stream(
                    { folder: 'clients' },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            return reject(new InternalServerErrorException('Error uploading image'));
                        }
                        resolve(result);
                    },
                );
                upload.end(photo.buffer);
            });

            photoUrl = (uploadResponse as any)?.secure_url || null;
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new InternalServerErrorException('Error uploading image');
        }
    }

    // Set default category to Bronze (id = 3) if categorieId is not provided
    const category = categorieId ? parseInt(categorieId, 10) : 3;

    // Check for null and handle accordingly
    const clientData = {
        nom,
        prenom,
        telephone,
        adresse: adresse || '', 
        photo: photoUrl || null, // ensure photoUrl is defined
        categorieId: category,  
        max_montant: max_montant !== undefined ? max_montant : 0, // Use ternary to ensure max_montant is defined
    };

    console.log('Client data to be created:', clientData);

    try {
        // Start creating the client
        const createdClient = await this.prisma.client.create({
            data: clientData,
            select: {
                id: true,
                nom: true,
                prenom: true,
                telephone: true,
                adresse: true,
                photo: true,
                max_montant: true,
                categorie: {
                    select: {
                        id: true,
                        libelle: true,
                    },
                },
                createAt: true,
                updatedAt: true,
            },
        });

        // Only create the user if login and password are provided
        if (login && password) {
            const hashedPassword = await this.encryptService.encryptPassword(password);
            const createdUser = await this.prisma.user.create({
                data: {
                    login,
                    password: hashedPassword,
                    clientId: createdClient.id,  // Link user to the newly created client
                    role: role
                },
            });
        }

        return createdClient;  // Return the created client details
    } catch (error) {
        console.error('Error during client creation:', error);
        throw new InternalServerErrorException('Erreur lors de la création du client');
    }
}


async updateClient(id: number, body: any, photo: Express.Multer.File) {
  const { nom, prenom, telephone, adresse, categorieId, max_montant, login, password } = body;

  // Check if the client exists
  const existingClient = await this.prisma.client.findUnique({
      where: { id },
      include: { users: true }, // Include users to check if associated user exists
  });

  if (!existingClient) {
      throw new NotFoundException(`Client with ID ${id} not found`);
  }

  let photoUrl: string | null = existingClient.photo;

  // Handle photo upload to Cloudinary if a new photo is provided
  if (photo) {
      try {
          const uploadResponse = await new Promise((resolve, reject) => {
              const upload = cloudinary.uploader.upload_stream(
                  { folder: 'clients' },
                  (error, result) => {
                      if (error) {
                          console.error('Cloudinary upload error:', error);
                          return reject(new InternalServerErrorException('Error uploading image'));
                      }
                      resolve(result);
                  },
              );
              upload.end(photo.buffer);
          });

          photoUrl = (uploadResponse as any)?.secure_url || null;
      } catch (error) {
          console.error('Cloudinary upload error:', error);
          throw new InternalServerErrorException('Error uploading image');
      }
  }

  // Set default category to Bronze (id = 3) if categorieId is not provided
  const category = categorieId ? parseInt(categorieId) : 3;

  // Update the client information in the database
  const updatedClient = await this.prisma.client.update({
      where: { id },
      data: {
          nom: nom || existingClient.nom,
          prenom: prenom || existingClient.prenom,
          telephone: telephone || existingClient.telephone,
          adresse: adresse || existingClient.adresse || '',
          photo: photoUrl,
          categorieId: category,
          max_montant: max_montant ? parseFloat(max_montant) : existingClient.max_montant,
      },
      select: {
          id: true,
          nom: true,
          prenom: true,
          telephone: true,
          adresse: true,
          photo: true,
          max_montant: true,
          categorie: {
              select: {
                  id: true,
                  libelle: true,
              },
          },
          createAt: true,
          updatedAt: true,
      },
  });

  // If login or password is provided, update the user
  if (login || password) {
      // Check if the client already has an associated user
      if (existingClient.users.length > 0) {
          const user = existingClient.users[0]; // Assume one user per client

          const hashedPassword = password ? await this.encryptService.encryptPassword(password) : user.password;

          // Update the user's login and password (if provided)
          await this.prisma.user.update({
              where: { id: user.id },
              data: {
                  login: login || user.login,
                  password: hashedPassword,
              },
          });
      }
  }

  return updatedClient; // Return the updated client details
}

async getClients(userId?: number, hasUser?: string): Promise<Client[]> {
  if (userId) {
    // If userId is provided, retrieve clients associated with that user
    const clients = await this.prisma.client.findMany({
      where: {
        users: {
          some: {
            id: userId,  // Filter clients by the provided userId
          },
        },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        adresse: true,
        photo: true,
        max_montant: true,
        categorieId: true,  // Include categorieId
        createAt: true,
        updatedAt: true,
        categorie: {
          select: {
            id: true,
            libelle: true,
          },
        },
      },
    });
    return clients;
  } else if (hasUser === 'true') {
    // Retrieve clients with associated users
    const clients = await this.prisma.client.findMany({
      where: {
        users: {
          some: {},  // Filter clients that have at least one associated user
        },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        adresse: true,
        photo: true,
        max_montant: true,
        categorieId: true,  // Include categorieId
        createAt: true,
        updatedAt: true,
        categorie: {
          select: {
            id: true,
            libelle: true,
          },
        },
        users: {
          select: {
            id: true,
            login: true,
            role: true,  // Include the role field from the User model
          },
        },
      },
    });
    return clients;
  } else if (hasUser === 'false') {
    // Retrieve clients without associated users
    const clients = await this.prisma.client.findMany({
      where: {
        users: {
          none: {},  // Filter clients that have no associated users
        },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        adresse: true,
        photo: true,
        max_montant: true,
        categorieId: true,  // Include categorieId
        createAt: true,
        updatedAt: true,
        categorie: {
          select: {
            id: true,
            libelle: true,
          },
        },
      },
    });
    return clients;
  } else {
    // If no userId or hasUser parameter is provided, return all clients
    const clients = await this.prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        telephone: true,
        adresse: true,
        photo: true,
        max_montant: true,
        categorieId: true,  // Include categorieId
        createAt: true,
        updatedAt: true,
        categorie: {
          select: {
            id: true,
            libelle: true,
          },
        },
        users: {
          select: {
            id: true,
            login: true,
            role: true,  // Include the role field from the User model
          },
        },
      },
    });
    return clients;
  }
}


  async getClientsDette() {
    return this.prisma.client.findMany({
      include: {
        dettes: {
          select: {
            date: true,
            montant: true,
            montantVerser: true,
            montantDue: true,
          }}}
    });
  }

  async getClientByTelephone(telephone: string) {
    return this.prisma.client.findFirst({ where: { telephone } });
  }

   
  async getDettesByClientId(clientId: number) {
    // Fetch client with their dettes
    const clientWithDettes = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { dettes: true },
    });
  
    if (!clientWithDettes) {
      return { message: "Client not found", dettes: [], max_montant: null };
    }
  
    // Calculate the maximum montantDue for this client's dettes
    const maxMontantDue = await this.prisma.dette.aggregate({
      where: { clientId: clientId },
      _max: {
        montantDue: true,
      },
    });
  
    // Attach max_montantDue to the client result
    return {
      client: {
        ...clientWithDettes,
        max_montantDue: maxMontantDue._max.montantDue || 0, // Default to 0 if no dettes
      },
    };
  }
  

  async getDettesByClients(): Promise<any[]> {
    
    try {
      // Query clients who have related dettes and select relevant fields
      const clientsWithDettes = await this.prisma.client.findMany({
        where: {
          dettes: {
            some: {}, // Filters to only include clients who have at least one dette
          },
        },
        select: {
          prenom: true,
          nom: true,
          telephone: true,
          adresse: true,
          dettes: {
            select: {
              id: true,
              montantDue: true,
              date: true,
            },
          },
        },
      });
  
  
      // Process the result to include montantDue directly under each client
      const clientsWithDueAmount = clientsWithDettes.map((client) => {
        // Sort the dettes by date descending
        const sortedDettes = client.dettes.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
  
        // Get the latest dette or set to null if none exist
        const latestDette = sortedDettes.length > 0 ? sortedDettes[0] : null;
  
        return {
          prenom: client.prenom,
          nom: client.nom,
          telephone: client.telephone,
          adresse: client.adresse,
          montantDue: client.dettes.reduce(
            (total, dette) => total + dette.montantDue,
            0 // Sum up all montantDue values
          ),
          detteId: latestDette ? latestDette.id : null,   // Include the id of the latest dette
          date: latestDette ? latestDette.date.toLocaleDateString('en-CA') : null, // Latest dette date
        };
      });
  
      return clientsWithDueAmount;
    } catch (error) {
      console.error('Error fetching client dettes:', error); // Log the full error
      throw new Error('Internal Server Error');
    }
  }
  
  

  async getDettesByClientTelephone(telephone: string): Promise<any[]> {
    try {
      // Fetch the client along with their dettes, articles, and users
      const clientWithDettes = await this.prisma.client.findUnique({
        where: { telephone },
        include: {
          dettes: {
            include: {
              articles: {
                include: {
                  article: true, // Include article details within dettes
                },
              },
              client: {
                include: {
                  users: true, // Include users associated with the client
                },
              },
            },
          },
        },
      });

      // If no client found, throw a NotFoundException
      if (!clientWithDettes) {
        throw new NotFoundException("Client n'existe pas");
      }

      // Map the dettes along with their articles and user email
      return clientWithDettes.dettes.map(dette => {
        const userEmail = dette.client.users.length > 0 ? dette.client.users[0].login : 'No email';

        return {
          id: dette.id,
          date: dette.date.toISOString(),
          montantDue: dette.montant,
          montantVerser: dette.montantVerser,
          montantRestant: dette.montant - dette.montantVerser,
          createAt: dette.createAt.toISOString(),
          updatedAt: dette.updatedAt.toISOString(),
          client: {
            id: dette.client.id,
            nom: dette.client.nom,
            prenom: dette.client.prenom,
            telephone: dette.client.telephone,
            adresse: dette.client.adresse,
            photo: dette.client.photo,
            email: userEmail,
          },
          articles: dette.articles.map(articleOnDette => ({
            id: articleOnDette.article.id,
            libelle: articleOnDette.article.libelle,
            prix: articleOnDette.article.prix,
            qteVente: articleOnDette.qteVente,
            date: articleOnDette.article.createAt.toLocaleDateString('en-CA'),
          })),
        };
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException("Client n'existe pas");
      }
      throw new InternalServerErrorException('Internal Server Error');
    }
  }


  async createClientCategory(data: Client) {
    // Get the Silver category ID
    const silverCategory = await this.prisma.categorie.findUnique({
      where: { libelle: 'Silver' },
    });

    let maxMontant: number | null = null;
    if (data.categorieId === silverCategory.id) {
      maxMontant = 100000; // Example max montant for Silver clients
    }

    // Create the client
    return this.prisma.client.create({
      data: {
        ...data,
        max_montant: maxMontant,
      },
    });
  }

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        categorie: true, // Include the client's category details
      },
    });
  }

  async deleteClient(id: number) {
    // Find the client first to ensure it exists
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    try {
      // Delete related users
      await this.prisma.user.deleteMany({
        where: { clientId: id },
      });

      // Delete related debts
      await this.prisma.dette.deleteMany({
        where: { clientId: id },
      });

      // Finally, delete the client
      await this.prisma.client.delete({
        where: { id },
      });
      
      return { message: `Client with ID ${id} deleted successfully` };
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new InternalServerErrorException('Error deleting client');
    }
  }

  async getClientById(id: number) {
    // Fetch the client with dettes and related articles
    const client = await this.prisma.client.findUnique({
      where: {
        id: id,
      },
      include: {
        dettes: {
          include: {
            articles: {
              select: {
                article: {
                  select: {
                    id: true,
                    libelle: true,
                    prix: true,
                    qteStock: true,
                  },
                },
                qteVente: true,
                prixVente: true,
              },
            },
          },
        },
        users: {
          select: {
            login: true,
          },
        },
      },
    });
  
    // Check if the client was found
    if (!client) {
      throw new HttpException('Client non trouvé', HttpStatus.NOT_FOUND);
    }
  
    return client; // Return the client with associated debts and articles
  }
  

}
