import { matchedData } from 'express-validator';
import { toClientResponse } from './support/clients.presenter.js';
import {
  listClients as listService,
  getClient as getService,
  addClient as addService,
  editClient as editService,
  removeClient as removeService,
} from './clients.service.js';

export async function listClients(req, res, next) {
  try {
    const result = await listService(
      matchedData(req, { locations: ['query'] }),
      req.auth,
    );
    return res.json({
      clients: result.clients.map(toClientResponse),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getClient(req, res, next) {
  try {
    return res.json(
      toClientResponse(await getService(req.params.id, req.auth)),
    );
  } catch (error) {
    return next(error);
  }
}

export async function createClient(req, res, next) {
  try {
    return res
      .status(201)
      .json(toClientResponse(await addService(req.validatedBody, req.auth)));
  } catch (error) {
    return next(error);
  }
}

export async function updateClient(req, res, next) {
  try {
    return res.json(
      toClientResponse(
        await editService(req.params.id, req.validatedBody, req.auth),
      ),
    );
  } catch (error) {
    return next(error);
  }
}

export async function deleteClient(req, res, next) {
  try {
    await removeService(req.params.id, req.auth);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
