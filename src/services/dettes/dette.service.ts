import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Article, DemandeStatus, Dette } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleService } from '../articles/article.service';
import { addDays, isAfter, isBefore } from 'date-fns';

@Injectable()
export class DetteService {
  private temporaryDemandes: any[] = []; // Temporary storage for demandes
  private demandeCounter = 0; // Initialize a counter for demandes

  constructor(private readonly prisma: PrismaService, 
    private articleService: ArticleService,
  ) {}

  // Store temporary demande
  async storeDemande(body: any) {
    // Extracting clientId and articles from the request body
    const { clientId, articles } = body;

    // Validate input
    if (!clientId || !Array.isArray(articles) || articles.length === 0) {
        throw new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);
    }

    // Filter articles to ensure valid IDs are provided
    const validArticles = articles.filter((a) => a.id !== undefined && a.qteVente > 0);
    if (validArticles.length === 0) {
        throw new HttpException('No valid articles provided', HttpStatus.BAD_REQUEST);
    }

    // Perform transaction to create the dette and update article stock
    return await this.prisma.$transaction(async (tx) => {
        // Check if the client exists
        const client = await tx.client.findUnique({
            where: { id: clientId },
            include: { dettes: true },  // Include debts to check their current status
        });
        if (!client) {
            throw new HttpException("Client does not exist", HttpStatus.NOT_FOUND);
        }

        // Bronze client validation (no debts)
        if (client.categorieId === 3) {  // Bronze category check
            const unpaidDebts = client.dettes.some((dette) => dette.montantDue > 0);
            if (unpaidDebts) {
                throw new HttpException('Les clients Bronze ne peuvent pas faire de demande avec des dettes impayées.', HttpStatus.FORBIDDEN);
            }
        }

        // Silver client validation (max_montant check)
        if (client.categorieId === 2) {  // Silver category check
            const totalUnpaidDebts = client.dettes.reduce((total, dette) => {
                return total + dette.montantDue;
            }, 0);

            if (client.max_montant !== null && totalUnpaidDebts >= client.max_montant) {
                throw new HttpException(`Le montant maximum de dette pour les clients Silver est atteint. Limite: ${client.max_montant}`, HttpStatus.FORBIDDEN);
            }
        }

        // Fetch all existing articles by IDs
        const articleIds = validArticles.map((a) => a.id);
        const existingArticles = await tx.article.findMany({ where: { id: { in: articleIds } } });
        if (existingArticles.length !== articleIds.length) {
            throw new HttpException("Not all articles found", HttpStatus.NOT_FOUND);
        }

        // Ensure stock quantity is sufficient for each article
        for (const article of validArticles) {
            const foundArticle = existingArticles.find((a) => a.id === article.id);
            if (!foundArticle) {
                throw new HttpException(`Article with ID ${article.id} not found.`, HttpStatus.NOT_FOUND);
            }
            if (foundArticle.qteStock < article.qteVente) {
                throw new HttpException(`Insufficient quantity for article: ${foundArticle.libelle}. Available stock: ${foundArticle.qteStock}`, HttpStatus.BAD_REQUEST);
            }
        }

        // Calculate the total debt amount
        const montant = validArticles.reduce((total, article) => {
            const foundArticle = existingArticles.find((a) => a.id === article.id);
            return total + (foundArticle?.prix ?? 0) * article.qteVente;
        }, 0);

        // Create a new dette with status set to EN_COURS
        const newDette = await tx.dette.create({
            data: {
                montant: montant,           // Total amount due
                montantDue: montant,       // Amount due (may be the same as montant)
                client: { connect: { id: clientId } },  // Connect to the existing client
                articles: {
                    create: validArticles.map((article) => ({
                        article: { connect: { id: article.id } },  // Connect to each article
                        qteVente: article.qteVente,  // Quantity sold
                        prixVente: article.prixVente, // Selling price (if applicable)
                    })),
                },
                status: 'EN_COURS',  // Set status to EN_COURS
            },
            include: {
                articles: {
                    select: {
                        article: { select: { id: true, libelle: true, qteStock: true, prix: true } },
                        qteVente: true,
                        prixVente: true,
                    },
                },
            },
        });

        return newDette; // Return the new dette object
    });
}

// Method to fetch article details from article IDs
  async getArticlesByIds(articleIds: number[]): Promise<Article[]> {
    return await this.articleService.getArticlesByIds(articleIds);
  }

  // Create a Dette from the stored demande
  async store(body: any) {
    // console.log("Received body:", body); // Log the received body
    const { clientId, articles } = body;

    // Validate input
    if (!clientId || !Array.isArray(articles) || articles.length === 0) {
      throw new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);
    }

    const validArticles = articles.filter((a) => a.id !== undefined);
    if (validArticles.length === 0) {
      throw new HttpException('No valid articles provided', HttpStatus.BAD_REQUEST);
    }

    // Perform transaction to create dette and update article stock
    return await this.prisma.$transaction(async (tx) => {
      // Check if client exists
      const clientExists = await tx.client.findUnique({ where: { id: clientId } });
      if (!clientExists) throw new HttpException("Client n'existe pas", HttpStatus.NOT_FOUND);

      // Fetch all existing articles by IDs
      const articleIds = validArticles.map((a) => a.id);
      const existingArticles = await tx.article.findMany({ where: { id: { in: articleIds } } });
      if (existingArticles.length !== articleIds.length) throw new HttpException("Pas d'articles trouvées", HttpStatus.NOT_FOUND);

      // Ensure stock quantity is sufficient for each article
      for (const article of validArticles) {
        const foundArticle = existingArticles.find((a) => a.id === article.id);
        if (!foundArticle) throw new HttpException(`L'article avec l'ID ${article.id} n'a pas été trouvé.`, HttpStatus.NOT_FOUND);
        if (foundArticle.qteStock < article.qteVente) {
          throw new HttpException(`Quantité non suffisante pour l'article: ${foundArticle.libelle}. Stock disponible: ${foundArticle.qteStock}`, HttpStatus.BAD_REQUEST);
        }
      }

      // Calculate the total debt amount
      const montant = validArticles.reduce((total, article) => {
        const foundArticle = existingArticles.find((a) => a.id === article.id);
        return total + (foundArticle?.prix ?? 0) * article.qteVente;
      }, 0);

      // Create a new dette with status set to ACCEPTE
      const newDette = await tx.dette.create({
        data: {
          montant: montant,
          montantDue: montant,
          client: { connect: { id: clientId } },
          articles: {
            create: validArticles.map((article) => ({
              article: { connect: { id: article.id } },
              qteVente: article.qteVente,
              prixVente: article.prixVente,
            })),
          },
          status: 'ACCEPTE', // Set the status to ACCEPTE
        },
        include: {
          articles: {
            select: {
              article: { select: {id:true, libelle: true, qteStock: true, prix: true } },
              qteVente: true,
              prixVente: true,
            },
          },
        },
      });

      return newDette; // Return the new dette object
    });
  }

  async getAllDemandes() {
    // Fetch all demandes with their associated articles and clients
    const demandes = await this.prisma.dette.findMany({
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
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            photo:true
          },
        },
      },
    });
  
    // Check if any demandes are found
    if (demandes.length === 0) {
      throw new HttpException('Aucune demande de dette trouvée', HttpStatus.NOT_FOUND);
    }
  
    return demandes; // Return the list of demandes
  }
  
  async getDemandesByClientId(clientId: number): Promise<Dette[]> {
    return await this.prisma.dette.findMany({
      where: { clientId: clientId }, // Assuming you have a `clientId` field in your `Dette` model
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
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            photo: true,
          },
        },
      },
    });
  }
  
  async getDemandeById(id: number) {
    // Fetch the demande (dette) with the given id
    const demande = await this.prisma.dette.findUnique({
      where: {
        id: id,
      },
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
        client: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
            photo: true,
            users:{
              select: {
                login: true
              }
            }
          },
        },
      },
    });

    // Check if the demande was found
    if (!demande) {
      throw new HttpException('Demande de dette non trouvée', HttpStatus.NOT_FOUND);
    }

    return demande; // Return the demande
  }

  async getClientById(clientId: number) {
    return await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  }

  async getDetteById(id: number) {
    return await this.prisma.dette.findUniqueOrThrow({
      where: { id },
      include: {
        articles: {
          select: {
            article: { select: { libelle: true, qteStock: true, prix: true } },
            qteVente: true,
            prixVente: true,
          },
        },
      },
    });
  }

  async registerPayment(detteId: number, montant: number) {
    const dette = await this.prisma.dette.findUnique({ where: { id: detteId } });
    if (!dette) {
      throw new NotFoundException("Cette dette n'existe pas");
    }

    if (montant > dette.montantDue) {
      throw new BadRequestException("Le paiement dépasse le montant restant dû");
    }

    const updatedMontantVerser = (dette.montantVerser || 0) + montant;
    const updatedMontantDue = dette.montant - updatedMontantVerser;

    await this.prisma.dette.update({
      where: { id: detteId },
      data: { montantVerser: updatedMontantVerser, montantDue: updatedMontantDue },
    });

    return await this.prisma.paiement.create({
      data: {
        montant: montant,
        detteId: detteId,
      },
    });
  }

  async getPaymentsByDetteId(detteId: number) {
    return await this.prisma.paiement.findMany({
      where: { detteId: detteId },
      orderBy: { date: 'asc' },
    });
  }

  async getArticlesByDetteId(detteId: number) {
    return await this.prisma.dette.findUnique({
      where: { id: detteId },
      select: {
        articles: {
          select: {
            article: { select: { libelle: true, qteStock: true, prix: true } },
            qteVente: true,
            prixVente: true,
          },
        },
      },
    });
  }

  // Cancel a temporary demande
  async cancelDemande(clientId: number) {
    const demandeIndex = this.temporaryDemandes.findIndex((d) => d.clientId === clientId);
    if (demandeIndex === -1) {
      throw new NotFoundException('Demande not found');
    }

    // Remove the demande from temporary storage
    this.temporaryDemandes.splice(demandeIndex, 1);
    return { message: 'Demande cancelled successfully' };
  }

  // List all temporary demandes
  getAllTemporaryDemandes() {
    return this.temporaryDemandes;
  }

  async getArticlesByDemandeId(detteId: number) {
    // Fetch the dette by its ID
    const dette = await this.prisma.dette.findUnique({
      where: { id: detteId },
      include: {
        articles: {
          select: {
            article: {
              select: {
                id: true,
                libelle: true,
                prix: true,
                qteStock: true, // Fetch current stock
              },
            },
            qteVente: true, // Quantity sold/ordered in this demande
            prixVente: true, // Price at which the article was sold
          },
        },
        client: {
          select: {
            id: true, 
            prenom: true,
            nom: true,
            telephone: true,
            photo: true,
            users: {
              select: {
                login: true,
              },
            },
          },
        },
      },
    });
  
    // If the dette doesn't exist, throw an exception
    if (!dette) {
      throw new NotFoundException(`La demande de dette avec l'ID ${detteId} n'a pas été trouvée.`);
    }
  
    // Extract the first user's login (assuming the client has at least one user)
    const userLogin = dette.client.users.length > 0 ? dette.client.users[0].login : null;
  
    return {
      id: dette.id,
      montant: dette.montant, // Total amount of the dette
      montantVerser: dette.montantVerser,
      montantDue: dette.montantDue,
      date: dette.createAt.toLocaleDateString(),
      status: dette.status,
      articles: dette.articles.map((articleData) => ({
        articleId: articleData.article.id,
        libelle: articleData.article.libelle,
        prixVente: articleData.prixVente,
        qteVente: articleData.qteVente,
        prixArticle: articleData.article.prix,
        qteStock: articleData.article.qteStock,
      })),
      clientId: dette.client.id,
      prenom: dette.client.prenom,
      nom: dette.client.nom,
      telephone: dette.client.telephone,
      photo: dette.client.photo,
      user: userLogin, // Use the first user's login or null if no users
    };
  }
  
  async updateDetteStatus(id: number, status: DemandeStatus) {
    // Check if the dette exists
    const existingDette = await this.prisma.dette.findUnique({
      where: { id },
      include: {
        articles: {
          include: {
            article: true, // Include the article details for updating stock
          },
        },
      },
    });
  
    if (!existingDette) {
      throw new NotFoundException(`Dette with ID ${id} not found.`);
    }
  
    // Check if the status is changing to 'ACCEPTE'
    if (status === 'ACCEPTE') {
      // Start a transaction to ensure data integrity
      return await this.prisma.$transaction(async (prisma) => {
        // Update the stock of each article
        for (const articleOnDette of existingDette.articles) {
          const { articleId, qteVente } = articleOnDette;
  
          // Decrease the stock of the article
          await prisma.article.update({
            where: { id: articleId },
            data: {
              qteStock: {
                decrement: qteVente, // Decrease stock by the quantity sold (qteVente)
              },
            },
          });
        }
  
        // Update the status of the dette to 'ACCEPTE'
        const updatedDette = await prisma.dette.update({
          where: { id },
          data: { status },
        });
  
        return updatedDette;
      });
    } else {
      // If not changing to 'ACCEPTE', just update the status
      return await this.prisma.dette.update({
        where: { id },
        data: { status },
      });
    }
  }
 
  async deleteDemande(id: number) {
    // Find the demande first to ensure it exists
    const existingDemande = await this.prisma.dette.findUnique({
      where: { id },
      include: {
        articles: {
          select: {
            articleId: true,
            qteVente: true,
          },
        },
      },
    });
  
    if (!existingDemande) {
      throw new NotFoundException(`Demande with ID ${id} not found`);
    }
  
    try {
      // Delete related articles first to avoid foreign key constraints
      await this.prisma.articleOnDettes.deleteMany({
        where: { detteId: id },
      });
  
      // Then delete the demande itself
      await this.prisma.dette.delete({
        where: { id },
      });
  
      return { message: `Demande with ID ${id} deleted successfully` };
    } catch (error) {
      console.error('Error deleting demande:', error);
      throw new InternalServerErrorException('Error deleting demande');
    }
  }


  // Relaunch a debt request (relance) within 2 days of disapproval
  async relanceDebtRequest(id: number) {
    const dette = await this.prisma.dette.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!dette) {
      throw new Error('Dette not found');
    }

    // Check if the debt request was disapproved and is within 2 days
    if (dette.status !== 'ANNULE') {
      throw new Error('La demande de dette doit être annulée pour être relancée.');
    }

    const twoDaysAfterCancellation = addDays(dette.updatedAt, 2);
    const currentDate = new Date();

    // Ensure that the relance happens within 2 days
    if (isBefore(currentDate, twoDaysAfterCancellation)) {
      // Update status to EN_COURS to allow relance
      return await this.prisma.dette.update({
        where: { id },
        data: { status: 'EN_COURS' },
      });
    } else {
      throw new Error('Le délai de 2 jours pour relancer la demande est écoulé.');
    }
  }
}
